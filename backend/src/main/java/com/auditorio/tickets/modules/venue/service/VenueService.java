package com.auditorio.tickets.modules.venue.service;

import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.venue.dto.*;
import com.auditorio.tickets.modules.venue.model.Seat;
import com.auditorio.tickets.modules.venue.model.Section;
import com.auditorio.tickets.modules.venue.model.Venue;
import com.auditorio.tickets.modules.venue.repository.SeatRepository;
import com.auditorio.tickets.modules.venue.repository.SectionRepository;
import com.auditorio.tickets.modules.venue.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class VenueService {

    private static final int MAX_BULK_SEATS = 5_000;

    /** Separación entre asientos en la cuadrícula de disposición por defecto. */
    private static final int SEAT_SPACING = 100;

    private final VenueRepository venueRepository;
    private final SectionRepository sectionRepository;
    private final SeatRepository seatRepository;
    private final EventSeatRepository eventSeatRepository;

    public VenueService(VenueRepository venueRepository,
                        SectionRepository sectionRepository,
                        SeatRepository seatRepository,
                        EventSeatRepository eventSeatRepository) {
        this.venueRepository = venueRepository;
        this.sectionRepository = sectionRepository;
        this.seatRepository = seatRepository;
        this.eventSeatRepository = eventSeatRepository;
    }

    public List<VenueDto> listAll() {
        return venueRepository.findAll().stream()
                .map(v -> VenueDto.fromEntity(v, sectionsOf(v.getId())))
                .toList();
    }

    public VenueDto get(UUID id) {
        Venue v = venueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue no encontrado"));
        return VenueDto.fromEntity(v, sectionsOf(v.getId()));
    }

    @Transactional
    public VenueDto create(CreateVenueRequest request) {
        Venue venue = Venue.builder()
                .name(request.name().trim())
                .address(request.address())
                .capacity(request.capacity())
                .build();
        venueRepository.save(venue);
        return VenueDto.fromEntity(venue, List.of());
    }

    @Transactional
    public VenueDto update(UUID id, CreateVenueRequest request) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue no encontrado"));
        venue.setName(request.name().trim());
        venue.setAddress(request.address());
        venue.setCapacity(request.capacity());
        venueRepository.save(venue);
        return VenueDto.fromEntity(venue, sectionsOf(venue.getId()));
    }

    @Transactional
    public void delete(UUID id) {
        if (!venueRepository.existsById(id)) {
            throw new ResourceNotFoundException("Venue no encontrado");
        }
        // CascadeType.ALL + ON DELETE CASCADE en BD eliminan sections y seats.
        venueRepository.deleteById(id);
    }

    // ---------- sections ----------

    @Transactional
    public SectionDto createSection(UUID venueId, CreateSectionRequest request) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue no encontrado"));
        String name = request.name().trim();
        if (sectionRepository.existsByVenueIdAndNameIgnoreCase(venueId, name)) {
            throw new BusinessException("Ya existe una sección con ese nombre en el venue");
        }
        Section section = Section.builder().venue(venue).name(name).build();
        sectionRepository.save(section);
        return SectionDto.fromEntity(section, 0);
    }

    @Transactional
    public void deleteSection(UUID sectionId) {
        if (!sectionRepository.existsById(sectionId)) {
            throw new ResourceNotFoundException("Sección no encontrada");
        }
        // Los seats referenciados por event_seats tienen FK ON DELETE RESTRICT:
        // borrar la sección fallaría en BD. Avisamos con un mensaje claro.
        if (eventSeatRepository.existsBySeat_Section_Id(sectionId)) {
            throw new BusinessException(
                    "No se puede eliminar la sección: tiene asientos asignados a uno o más eventos. "
                            + "Elimina primero esos eventos.");
        }
        sectionRepository.deleteById(sectionId);
    }

    public List<SeatDto> listSeatsOfSection(UUID sectionId) {
        if (!sectionRepository.existsById(sectionId)) {
            throw new ResourceNotFoundException("Sección no encontrada");
        }
        return seatRepository.findBySectionId(sectionId).stream()
                .map(SeatDto::fromEntity)
                .toList();
    }

    // ---------- seats (bulk) ----------

    @Transactional
    public List<SeatDto> bulkCreateSeats(UUID sectionId, BulkSeatRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sección no encontrada"));

        int total = request.rows().stream()
                .mapToInt(r -> {
                    if (r.toNumber() < r.fromNumber()) {
                        throw new BusinessException("Rango inválido en fila " + r.rowLabel());
                    }
                    return r.toNumber() - r.fromNumber() + 1;
                })
                .sum();
        if (total > MAX_BULK_SEATS) {
            throw new BusinessException("Demasiados asientos en una sola operación (máx. " + MAX_BULK_SEATS + ")");
        }

        // Disposición por defecto en cuadrícula: pos_x según el número de
        // asiento y pos_y según el orden de la fila. Se consideran las filas
        // ya existentes para que las nuevas no se solapen con ellas.
        Map<String, Integer> rowRank = buildRowRank(sectionId, request);

        List<Seat> toCreate = new ArrayList<>(total);
        for (BulkSeatRequest.RowRange r : request.rows()) {
            for (int n = r.fromNumber(); n <= r.toNumber(); n++) {
                toCreate.add(Seat.builder()
                        .section(section)
                        .rowLabel(r.rowLabel())
                        .seatNumber(n)
                        .posX((n - 1) * SEAT_SPACING)
                        .posY(rowRank.get(r.rowLabel()) * SEAT_SPACING)
                        .build());
            }
        }
        try {
            List<Seat> saved = seatRepository.saveAll(toCreate);
            // refrescar para que Hibernate cargue el seat_code generado por la BD
            seatRepository.flush();
            return seatRepository.findBySectionId(sectionId).stream()
                    .map(SeatDto::fromEntity)
                    .toList();
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new BusinessException("Hay asientos duplicados en la sección (mismo row+number)");
        }
    }

    // ---------- helpers ----------

    /**
     * Asigna un índice de orden a cada fila de la sección (existentes + nuevas),
     * ordenadas A..Z, AA.. — mismo criterio que la migración V4.
     */
    private Map<String, Integer> buildRowRank(UUID sectionId, BulkSeatRequest request) {
        Set<String> rows = new TreeSet<>(
                Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));
        seatRepository.findBySectionId(sectionId).forEach(s -> rows.add(s.getRowLabel()));
        request.rows().forEach(r -> rows.add(r.rowLabel()));
        Map<String, Integer> rank = new HashMap<>();
        int idx = 0;
        for (String row : rows) {
            rank.put(row, idx++);
        }
        return rank;
    }

    private List<SectionDto> sectionsOf(UUID venueId) {
        return sectionRepository.findByVenueId(venueId).stream()
                .map(s -> SectionDto.fromEntity(s, seatRepository.countBySectionId(s.getId())))
                .toList();
    }
}
