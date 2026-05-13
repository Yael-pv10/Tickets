package com.auditorio.tickets.modules.event.controller;

import com.auditorio.tickets.modules.event.dto.EventDto;
import com.auditorio.tickets.modules.event.dto.EventSeatDto;
import com.auditorio.tickets.modules.event.service.EventService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@Tag(name = "Public Events", description = "Catálogo público de eventos")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public Page<EventDto> list(Pageable pageable) {
        return eventService.listPublished(pageable);
    }

    @GetMapping("/{id}")
    public EventDto get(@PathVariable UUID id) {
        return eventService.getPublic(id);
    }

    @GetMapping("/{id}/seats")
    public List<EventSeatDto> seats(@PathVariable UUID id) {
        return eventService.listSeats(id);
    }
}
