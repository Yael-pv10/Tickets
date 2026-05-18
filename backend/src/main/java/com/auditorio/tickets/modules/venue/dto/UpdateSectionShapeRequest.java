package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Point;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * Actualiza el tipo, la forma (polígono) y el cupo de una sección.
 * El cupo solo aplica a secciones de admisión general.
 */
public record UpdateSectionShapeRequest(
        @NotBlank String type,
        List<Point> shape,
        @Min(1) @Max(1_000_000) Integer capacity
) {}
