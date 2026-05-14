package com.auditorio.tickets.modules.event.service;

import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.event.dto.CreateEventRequest;
import com.auditorio.tickets.modules.event.dto.EventDto;
import com.auditorio.tickets.modules.event.dto.EventSeatDto;
import com.auditorio.tickets.modules.event.dto.SectionPrice;
import com.auditorio.tickets.modules.event.dto.UpdateEventRequest;
import com.auditorio.tickets.modules.event.model.Event;
import com.auditorio.tickets.modules.event.model.EventStatus;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.venue.model.Section;
import com.auditorio.tickets.modules.venue.model.Venue;
import com.auditorio.tickets.modules.venue.repository.SectionRepository;
import com.auditorio.tickets.modules.venue.repository.VenueRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final EventSeatRepository eventSeatRepository;
    private final VenueRepository venueRepository;
    private final SectionRepository sectionRepository;

    public EventService(EventRepository eventRepository,
                        EventSeatRepository eventSeatRepository,
                        VenueRepository venueRepository,
                        SectionRepository sectionRepository) {
        this.eventRepository = eventRepository;
        this.eventSeatRepository = eventSeatRepository;
        this.venueRepository = venueRepository;
        this.sectionRepository = sectionRepository;
    }

    // ---------- consultas públicas ----------

    public Page<EventDto> listPublished(Pageable pageable) {
        return eventRepository
                .findByStatusAndStartsAtAfterOrderByStartsAtAsc(EventStatus.PUBLISHED, Instant.now(), pageable)
                .map(EventDto::fromEntity);
    }

    public EventDto getPublic(UUID id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Evento no encontrado");
        }
        return EventDto.fromEntity(event);
    }

    public java.util.List<EventSeatDto> listSeats(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Evento no encontrado");
        }
        return eventSeatRepository.findByEventId(eventId).stream()
                .map(EventSeatDto::fromEntity)
                .toList();
    }

    // ---------- admin ----------

    public java.util.List<EventDto> listAllForAdmin() {
        return eventRepository.findAll().stream().map(EventDto::fromEntity).toList();
    }

    @Transactional
    public EventDto create(CreateEventRequest request) {
        Venue venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue no encontrado"));
        if (request.endsAt() != null && !request.endsAt().isAfter(request.startsAt())) {
            throw new BusinessException("endsAt debe ser posterior a startsAt");
        }

        List<Section> sections = sectionRepository.findByVenueId(venue.getId());
        if (sections.isEmpty()) {
            throw new BusinessException("El venue no tiene secciones definidas");
        }
        Map<UUID, Integer> priceBySectionId = resolveSectionPrices(
                request.sectionPrices(), request.defaultPriceCents(), sections);

        Event event = Event.builder()
                .venue(venue)
                .title(request.title().trim())
                .description(sanitizeHtml(request.description()))
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .status(EventStatus.DRAFT)
                .build();
        eventRepository.save(event);
        eventRepository.flush();

        int seededTotal = 0;
        for (Section section : sections) {
            int price = priceBySectionId.get(section.getId());
            seededTotal += eventSeatRepository.seedFromSection(event.getId(), section.getId(), price);
        }
        if (seededTotal == 0) {
            throw new BusinessException("El venue no tiene asientos definidos");
        }
        return EventDto.fromEntity(event);
    }

    /**
     * Construye el mapa sectionId → priceCents combinando overrides explícitos y default.
     * Valida que cada sección referenciada exista en el venue y que no haya duplicados.
     */
    private Map<UUID, Integer> resolveSectionPrices(List<SectionPrice> overrides,
                                                    int defaultPriceCents,
                                                    List<Section> venueSections) {
        Map<UUID, Integer> resolved = new HashMap<>();
        for (Section s : venueSections) {
            resolved.put(s.getId(), defaultPriceCents);
        }
        if (overrides == null || overrides.isEmpty()) {
            return resolved;
        }
        Set<UUID> validSectionIds = resolved.keySet();
        Set<UUID> seen = new HashSet<>();
        for (SectionPrice override : overrides) {
            if (!seen.add(override.sectionId())) {
                throw new BusinessException(
                        "Precio duplicado para la sección " + override.sectionId());
            }
            if (!validSectionIds.contains(override.sectionId())) {
                throw new BusinessException(
                        "La sección " + override.sectionId() + " no pertenece al venue");
            }
            resolved.put(override.sectionId(), override.priceCents());
        }
        return resolved;
    }

    @Transactional
    public EventDto update(UUID id, UpdateEventRequest request) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));
        if (request.endsAt() != null && !request.endsAt().isAfter(request.startsAt())) {
            throw new BusinessException("endsAt debe ser posterior a startsAt");
        }
        event.setTitle(request.title().trim());
        event.setDescription(sanitizeHtml(request.description()));
        event.setStartsAt(request.startsAt());
        event.setEndsAt(request.endsAt());
        return EventDto.fromEntity(event);
    }

    @Transactional
    public EventDto changeStatus(UUID id, EventStatus newStatus) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));
        validateTransition(event.getStatus(), newStatus);
        event.setStatus(newStatus);
        return EventDto.fromEntity(event);
    }

    @Transactional
    public void delete(UUID id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));
        if (event.getStatus() == EventStatus.PUBLISHED) {
            throw new BusinessException("No se puede eliminar un evento publicado. Cancélalo primero.");
        }
        eventRepository.delete(event);
    }

    private void validateTransition(EventStatus from, EventStatus to) {
        boolean ok = switch (from) {
            case DRAFT     -> to == EventStatus.PUBLISHED || to == EventStatus.CANCELLED;
            case PUBLISHED -> to == EventStatus.CANCELLED || to == EventStatus.FINISHED;
            case CANCELLED, FINISHED -> false;
        };
        if (!ok) {
            throw new BusinessException("Transición de estado no permitida: " + from + " → " + to);
        }
    }

    private String sanitizeHtml(String input) {
        if (input == null) return null;
        return Jsoup.clean(input, Safelist.basic());
    }
}
