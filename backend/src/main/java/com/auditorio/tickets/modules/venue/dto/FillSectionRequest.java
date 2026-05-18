package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Point;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Rellena una sección de asientos por interpolación. La sección se define
 * con 4 esquinas en orden: frente-izq, frente-der, fondo-der, fondo-izq.
 * El sistema coloca una cuadrícula de filas x asientos dentro de esa forma.
 * Reemplaza los asientos que tuviera la sección.
 */
public record FillSectionRequest(
        @NotNull @Size(min = 4, max = 4) List<Point> corners,
        @Min(1) @Max(500) int rows,
        @Min(1) @Max(500) int seatsPerRow
) {}
