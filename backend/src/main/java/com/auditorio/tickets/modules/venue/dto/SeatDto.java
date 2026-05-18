package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Seat;

import java.util.UUID;

public record SeatDto(
        UUID id,
        UUID sectionId,
        String rowLabel,
        int seatNumber,
        String seatCode,
        int posX,
        int posY
) {
    public static SeatDto fromEntity(Seat s) {
        return new SeatDto(
                s.getId(),
                s.getSection().getId(),
                s.getRowLabel(),
                s.getSeatNumber(),
                s.getSeatCode(),
                s.getPosX(),
                s.getPosY()
        );
    }
}
