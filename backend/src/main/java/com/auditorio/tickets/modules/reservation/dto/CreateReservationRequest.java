package com.auditorio.tickets.modules.reservation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateReservationRequest(
        @NotNull UUID eventId,
        @NotEmpty(message = "Debes seleccionar al menos un asiento")
        @Size(max = 8, message = "Máximo 8 asientos por reserva")
        List<@NotNull UUID> eventSeatIds
) {}
