package com.auditorio.tickets.modules.event.dto;

import com.auditorio.tickets.modules.event.model.Event;

import java.time.Instant;
import java.util.UUID;

public record EventDto(
        UUID id,
        UUID venueId,
        String venueName,
        String title,
        String description,
        Instant startsAt,
        Instant endsAt,
        String status
) {
    public static EventDto fromEntity(Event e) {
        return new EventDto(
                e.getId(),
                e.getVenue().getId(),
                e.getVenue().getName(),
                e.getTitle(),
                e.getDescription(),
                e.getStartsAt(),
                e.getEndsAt(),
                e.getStatus().name()
        );
    }
}
