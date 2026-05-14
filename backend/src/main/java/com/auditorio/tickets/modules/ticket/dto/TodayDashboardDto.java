package com.auditorio.tickets.modules.ticket.dto;

import java.util.List;

/**
 * Estado del día para el staff: eventos en cartelera hoy más cuántos boletos
 * ha validado el propio operador desde el inicio del día local.
 */
public record TodayDashboardDto(
        List<TodayEventDto> events,
        long myValidationsToday
) {}
