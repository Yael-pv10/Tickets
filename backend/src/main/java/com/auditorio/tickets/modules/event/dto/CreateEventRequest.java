package com.auditorio.tickets.modules.event.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record CreateEventRequest(
        @NotNull UUID venueId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 5000) String description,
        @NotNull @Future Instant startsAt,
        Instant endsAt,
        @Min(0) int defaultPriceCents
) {}
