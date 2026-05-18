package com.auditorio.tickets.modules.venue.service;

import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.venue.dto.*;
import com.auditorio.tickets.modules.venue.model.Point;
import com.auditorio.tickets.modules.venue.model.Seat;
import com.auditorio.tickets.modules.venue.model.Section;
import com.auditorio.tickets.modules.venue.model.SectionType;
import com.auditorio.tickets.modules.venue.model.Venue;
import com.auditorio.tickets.modules.venue.model.VenueBackground;
import com.auditorio.tickets.modules.venue.repository.SeatRepository;
import com.auditorio.tickets.modules.venue.repository.SectionRepository;
import com.auditorio.tickets.modules.venue.repository.VenueBackgroundRepository;
import com.auditorio.tickets.modules.venue.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VenueService {

    private static final int MAX_BULK_SEATS = 5_000;

    /** Separación entre asientos en la cuadrícula de disposición por defecto. */
    private static final int SEAT_SPACING = 100;

    private static final long MAX_BG_BYTES = 8L * 1024 * 1024;
    private static final Set<String> ALLOWED_BG_MIME =
            Set.of("image/png", "image/jpeg", "image/webp");

    private final VenueRepository venueRepository;
    private final SectionRepository sectionRepository;
    private final SeatRepository seatRepository;
    private final EventSeatRepository eventSeatRepository;
    private final EventRepository eventRepository;
    private final VenueBackgroundRepository venueBackgroundRepository;

    public VenueService(VenueRepository venueRepository,
                        SectionRepository sectionRepository,
                        SeatRepository seatRepository,
                        EventSeatRepository eventSeatRepository,
                        EventRepository eventRepository,
                        VenueBackgroundRepository venueBackgroundRepository) {
        this.venueRepository = venueRepository;
        this.sectionRepository = sectionRepository;
        this.seatRepository = seatRepository;
        this.eventSeatRepository = eventSeatRepository;
        this.eventRepository = eventRepository;
        this.venueBackgroundRepository = venueBackgroundRepository;
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

    /** Configura el lienzo del auditorio y el polígono del escenario. */
    @Transactional
    public VenueDto updateVenueCanvas(UUID venueId, UpdateVenueCanvasRequest request) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue no encontrado"));
        validatePolygon(request.stageShape());
        venue.setCanvasWidth(request.canvasWidth());
        venue.setCanvasHeight(request.canvasHeight());
        venue.setStageShape(request.stageShape());
        venueRepository.save(venue);
        return VenueDto.fromEntity(venue, sectionsOf(venue.getId()));
    }

    @Transactional
    public void delete(UUID id) {
        if (!venueRepository.existsById(id)) {
            throw new ResourceNotFoundException("Venue no encontrado");
        }
        // events.venue_id no tiene ON DELETE CASCADE: avisamos con un mensaje claro
        // en vez de dejar que falle con una violación de integridad.
        if (eventRepository.existsByVenue_Id(id)) {
            throw new BusinessException(
                    "No se puede eliminar el auditorio: tiene eventos asociados. "
                            + "Elimina primero esos eventos.");
        }
        // CascadeType.ALL + ON DELETE CASCADE en BD eliminan sections y seats.
        venueRepository.deleteById(id);
    }

    // ---------- imagen de fondo (plano) ----------

    @Transactional
    public void setBackground(UUID venueId, MultipartFile file) {
        if (!venueRepository.existsById(venueId)) {
            throw new ResourceNotFoundException("Venue no encontrado");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("No se recibió ninguna imagen");
        }
        String mime = file.getContentType();
        if (mime == null || !ALLOWED_BG_MIME.contains(mime)) {
            throw new BusinessException("Formato no admitido. Usa PNG, JPEG o WebP");
        }
        if (file.getSize() > MAX_BG_BYTES) {
            throw new BusinessException("La imagen supera el tamaño máximo (8 MB)");
        }
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException("No se pudo leer la imagen");
        }
        VenueBackground bg = venueBackgroundRepository.findById(venueId)
                .orElseGet(() -> {
                    VenueBackground b = new VenueBackground();
                    b.setVenueId(venueId);
                    return b;
                });
        bg.setImage(data);
        bg.setMime(mime);
        bg.setUpdatedAt(Instant.now());
        venueBackgroundRepository.save(bg);
    }

    @Transactional
    public void deleteBackground(UUID venueId) {
        venueBackgroundRepository.deleteById(venueId);
    }

    public VenueBackground getBackground(UUID venueId) {
        return venueBackgroundRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("El auditorio no tiene plano"));
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

    /** Actualiza el tipo, la forma (polígono) y el cupo de una sección. */
    @Transactional
    public SectionDto updateSectionShape(UUID sectionId, UpdateSectionShapeRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sección no encontrada"));
        SectionType type;
        try {
            type = SectionType.valueOf(request.type());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Tipo de sección inválido");
        }
        validatePolygon(request.shape());

        if (type == SectionType.GENERAL_ADMISSION) {
            Integer capacity = request.capacity();
            if (capacity == null || capacity <= 0) {
                throw new BusinessException("Una sección de admisión general requiere un cupo válido");
            }
            if (capacity > MAX_BULK_SEATS) {
                throw new BusinessException("Cupo demasiado alto (máx. " + MAX_BULK_SEATS + ")");
            }
            // La admisión general se vende por cupo, pero el flujo de reserva
            // es por asiento: generamos 'capacity' cupos como asientos internos.
            boolean regen = section.getType() != SectionType.GENERAL_ADMISSION
                    || seatRepository.countBySectionId(sectionId) != capacity;
            if (regen) {
                if (eventSeatRepository.existsBySeat_Section_Id(sectionId)) {
                    throw new BusinessException(
                            "No se puede cambiar el cupo: la sección ya tiene asientos en un evento.");
                }
                seatRepository.deleteBySectionId(sectionId);
                List<Seat> cupos = new ArrayList<>(capacity);
                for (int i = 1; i <= capacity; i++) {
                    cupos.add(Seat.builder()
                            .section(section).rowLabel("GA").seatNumber(i).posX(0).posY(0).build());
                }
                seatRepository.saveAll(cupos);
            }
            section.setCapacity(capacity);
        } else {
            section.setCapacity(null);
        }
        section.setType(type);
        section.setShape(request.shape());
        sectionRepository.save(section);
        return SectionDto.fromEntity(section, seatRepository.countBySectionId(sectionId));
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

    /** Guarda las coordenadas de los asientos que el admin reacomodó en el editor. */
    @Transactional
    public List<SeatDto> updateSectionLayout(UUID sectionId, UpdateSeatLayoutRequest request) {
        if (!sectionRepository.existsById(sectionId)) {
            throw new ResourceNotFoundException("Sección no encontrada");
        }
        List<Seat> seats = seatRepository.findBySectionId(sectionId);
        Map<UUID, Seat> byId = seats.stream().collect(Collectors.toMap(Seat::getId, s -> s));

        for (UpdateSeatLayoutRequest.SeatPosition p : request.seats()) {
            Seat seat = byId.get(p.seatId());
            if (seat == null) {
                throw new BusinessException("El asiento " + p.seatId() + " no pertenece a la sección");
            }
            seat.setPosX(p.posX());
            seat.setPosY(p.posY());
        }
        // Entidades gestionadas: el dirty checking persiste los cambios al commit.
        return seats.stream().map(SeatDto::fromEntity).toList();
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

    /**
     * Rellena una sección con una cuadrícula de asientos por interpolación
     * bilineal dentro de las 4 esquinas dadas. Reemplaza los asientos previos.
     */
    @Transactional
    public List<SeatDto> fillSection(UUID sectionId, FillSectionRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sección no encontrada"));

        int total = request.rows() * request.seatsPerRow();
        if (total > MAX_BULK_SEATS) {
            throw new BusinessException("Demasiados asientos (máx. " + MAX_BULK_SEATS + ")");
        }
        validatePolygon(request.corners());
        if (eventSeatRepository.existsBySeat_Section_Id(sectionId)) {
            throw new BusinessException(
                    "No se puede regenerar la sección: ya tiene asientos asignados a un evento.");
        }

        // Reemplaza la cuadrícula previa.
        seatRepository.deleteBySectionId(sectionId);

        List<Point> c = request.corners();
        Point frontLeft = c.get(0), frontRight = c.get(1), backRight = c.get(2), backLeft = c.get(3);

        List<Seat> toCreate = new ArrayList<>(total);
        for (int r = 0; r < request.rows(); r++) {
            double v = request.rows() == 1 ? 0 : (double) r / (request.rows() - 1);
            String row = rowLabel(r);
            for (int col = 0; col < request.seatsPerRow(); col++) {
                double u = request.seatsPerRow() == 1 ? 0 : (double) col / (request.seatsPerRow() - 1);
                Point front = lerp(frontLeft, frontRight, u);
                Point back = lerp(backLeft, backRight, u);
                Point pos = lerp(front, back, v);
                toCreate.add(Seat.builder()
                        .section(section)
                        .rowLabel(row)
                        .seatNumber(col + 1)
                        .posX(pos.x())
                        .posY(pos.y())
                        .build());
            }
        }

        // La forma de la sección es el cuadrilátero de las 4 esquinas.
        section.setType(SectionType.SEATED);
        section.setShape(request.corners());
        section.setCapacity(null);
        sectionRepository.save(section);

        seatRepository.saveAll(toCreate);
        seatRepository.flush();
        return seatRepository.findBySectionId(sectionId).stream()
                .map(SeatDto::fromEntity)
                .toList();
    }

    // ---------- helpers ----------

    /** Interpolación lineal entre dos puntos (t en [0,1]). */
    private static Point lerp(Point a, Point b, double t) {
        return new Point(
                (int) Math.round(a.x() + (b.x() - a.x()) * t),
                (int) Math.round(a.y() + (b.y() - a.y()) * t));
    }

    /** Etiqueta de fila estilo hoja de cálculo: 0→A, 25→Z, 26→AA. */
    private static String rowLabel(int index) {
        StringBuilder sb = new StringBuilder();
        int n = index;
        do {
            sb.insert(0, (char) ('A' + n % 26));
            n = n / 26 - 1;
        } while (n >= 0);
        return sb.toString();
    }

    /** Valida un polígono opcional: si viene, ha de tener 3+ puntos en rango. */
    private void validatePolygon(List<Point> polygon) {
        if (polygon == null || polygon.isEmpty()) {
            return;
        }
        if (polygon.size() < 3) {
            throw new BusinessException("Un polígono necesita al menos 3 puntos");
        }
        for (Point p : polygon) {
            if (p.x() < 0 || p.y() < 0 || p.x() > 100_000 || p.y() > 100_000) {
                throw new BusinessException("Coordenadas del polígono fuera de rango");
            }
        }
    }

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
