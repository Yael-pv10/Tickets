package com.auditorio.tickets.modules.venue.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/**
 * Guarda la disposición (coordenadas) de los asientos de una sección.
 * Es una actualización parcial: solo los asientos incluidos cambian de
 * posición, el resto conserva la suya.
 */
public record UpdateSeatLayoutRequest(
        @NotEmpty @Valid List<SeatPosition> seats
) {
    public record SeatPosition(
            @NotNull UUID seatId,
            @Min(0) @Max(100_000) int posX,
            @Min(0) @Max(100_000) int posY
    ) {}
}
