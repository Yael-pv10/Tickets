package com.auditorio.tickets.modules.event.dto;

import com.auditorio.tickets.modules.event.model.EventSeat;

import java.util.UUID;

public record EventSeatDto(
        UUID id,
        UUID seatId,
        String seatCode,
        String sectionName,
        String rowLabel,
        int seatNumber,
        int posX,
        int posY,
        int priceCents,
        String status
) {
    public static EventSeatDto fromEntity(EventSeat es) {
        return new EventSeatDto(
                es.getId(),
                es.getSeat().getId(),
                es.getSeat().getSeatCode(),
                es.getSeat().getSection().getName(),
                es.getSeat().getRowLabel(),
                es.getSeat().getSeatNumber(),
                es.getSeat().getPosX(),
                es.getSeat().getPosY(),
                es.getPriceCents(),
                es.getStatus().name()
        );
    }
}
