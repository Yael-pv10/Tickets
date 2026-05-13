package com.auditorio.tickets.modules.ticket.dto;

import com.auditorio.tickets.modules.ticket.model.Ticket;

import java.time.Instant;
import java.util.UUID;

public record TicketDto(
        UUID id,
        UUID code,
        String qrPayload,
        String status,
        String eventTitle,
        Instant eventStartsAt,
        String venueName,
        String seatCode,
        String sectionName,
        int priceCents,
        Instant issuedAt,
        Instant usedAt
) {
    public static TicketDto fromEntity(Ticket t) {
        return new TicketDto(
                t.getId(),
                t.getCode(),
                t.getCode().toString() + "." + t.getQrSignature(),
                t.getStatus().name(),
                t.getEventSeat().getEvent().getTitle(),
                t.getEventSeat().getEvent().getStartsAt(),
                t.getEventSeat().getEvent().getVenue().getName(),
                t.getEventSeat().getSeat().getSeatCode(),
                t.getEventSeat().getSeat().getSection().getName(),
                t.getEventSeat().getPriceCents(),
                t.getIssuedAt(),
                t.getUsedAt()
        );
    }
}
