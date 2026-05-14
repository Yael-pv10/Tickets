package com.auditorio.tickets.modules.event.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Override de precio para una sección concreta al crear un evento.
 * Las secciones no listadas heredan {@code defaultPriceCents}.
 */
public record SectionPrice(
        @NotNull UUID sectionId,
        @Min(0) int priceCents
) {}
