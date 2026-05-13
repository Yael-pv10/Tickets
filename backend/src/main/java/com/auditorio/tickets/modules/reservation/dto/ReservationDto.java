package com.auditorio.tickets.modules.reservation.dto;

import com.auditorio.tickets.modules.reservation.model.Reservation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReservationDto(
        UUID id,
        UUID eventId,
        String eventTitle,
        String status,
        Instant expiresAt,
        int totalCents,
        List<ReservationItemDto> items
) {
    public static ReservationDto fromEntity(Reservation r, List<ReservationItemDto> items) {
        return new ReservationDto(
                r.getId(),
                r.getEvent().getId(),
                r.getEvent().getTitle(),
                r.getStatus().name(),
                r.getExpiresAt(),
                r.getTotalCents(),
                items
        );
    }
}
