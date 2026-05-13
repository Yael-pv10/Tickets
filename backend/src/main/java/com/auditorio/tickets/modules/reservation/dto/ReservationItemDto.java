package com.auditorio.tickets.modules.reservation.dto;

import com.auditorio.tickets.modules.event.model.EventSeat;

import java.util.UUID;

public record ReservationItemDto(
        UUID eventSeatId,
        String seatCode,
        String sectionName,
        int priceCents
) {
    public static ReservationItemDto fromEntity(EventSeat es) {
        return new ReservationItemDto(
                es.getId(),
                es.getSeat().getSeatCode(),
                es.getSeat().getSection().getName(),
                es.getPriceCents()
        );
    }
}
