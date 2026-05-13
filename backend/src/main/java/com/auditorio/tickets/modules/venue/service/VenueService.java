package com.auditorio.tickets.modules.venue.service;

import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
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
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class VenueService {

    private static final int MAX_BULK_SEATS = 5_000;

    private final VenueRepository venueRepository;
    private final SectionRepository sectionRepository;
    private final SeatRepository seatRepository;

    public VenueService(VenueRepository venueRepository,
                        SectionRepository sectionRepository,
                        SeatRepository seatRepository) {
        this.venueRepository = venueRepository;
        this.sectionRepository = sectionRepository;
        this.seatRepository = seatRepository;
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

        List<Seat> toCreate = new ArrayList<>(total);
        for (BulkSeatRequest.RowRange r : request.rows()) {
            for (int n = r.fromNumber(); n <= r.toNumber(); n++) {
                toCreate.add(Seat.builder()
                        .section(section)
                        .rowLabel(r.rowLabel())
                        .seatNumber(n)
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

    private List<SectionDto> sectionsOf(UUID venueId) {
        return sectionRepository.findByVenueId(venueId).stream()
                .map(s -> SectionDto.fromEntity(s, seatRepository.countBySectionId(s.getId())))
                .toList();
    }
}
