package com.auditorio.tickets.modules.event.controller;

import com.auditorio.tickets.modules.event.dto.CreateEventRequest;
import com.auditorio.tickets.modules.event.dto.EventDto;
import com.auditorio.tickets.modules.event.dto.UpdateEventRequest;
import com.auditorio.tickets.modules.event.model.EventStatus;
import com.auditorio.tickets.modules.event.service.EventService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/events")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Events", description = "Gestión de eventos (admin)")
public class AdminEventController {

    private final EventService eventService;

    public AdminEventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventDto> list() {
        return eventService.listAllForAdmin();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventDto create(@Valid @RequestBody CreateEventRequest request) {
        return eventService.create(request);
    }

    @PutMapping("/{id}")
    public EventDto update(@PathVariable UUID id, @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(id, request);
    }

    @PostMapping("/{id}/publish")
    public EventDto publish(@PathVariable UUID id) {
        return eventService.changeStatus(id, EventStatus.PUBLISHED);
    }

    @PostMapping("/{id}/cancel")
    public EventDto cancel(@PathVariable UUID id) {
        return eventService.changeStatus(id, EventStatus.CANCELLED);
    }

    @PostMapping("/{id}/finish")
    public EventDto finish(@PathVariable UUID id) {
        return eventService.changeStatus(id, EventStatus.FINISHED);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        eventService.delete(id);
    }
}
