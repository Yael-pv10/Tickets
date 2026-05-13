package com.auditorio.tickets.modules.venue.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * Crea varios asientos a la vez. Cada entrada representa una fila
 * con un rango de números, p. ej.: rowLabel="A", from=1, to=20 ⇒ A1..A20.
 */
public record BulkSeatRequest(
        @NotEmpty @Valid List<RowRange> rows
) {
    public record RowRange(
            @NotBlank @Pattern(regexp = "^[A-Z]+$", message = "rowLabel debe ser mayúsculas")
            String rowLabel,
            @Min(1) int fromNumber,
            @Min(1) int toNumber
    ) {}
}
