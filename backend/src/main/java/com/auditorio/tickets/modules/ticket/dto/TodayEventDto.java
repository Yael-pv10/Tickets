package com.auditorio.tickets.modules.ticket.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Resumen de un evento del día para el panel de staff.
 */
public record TodayEventDto(
        UUID id,
        String title,
        String venueName,
        Instant startsAt,
        Instant endsAt,
        long issuedCount,
        long validatedCount
) {}
