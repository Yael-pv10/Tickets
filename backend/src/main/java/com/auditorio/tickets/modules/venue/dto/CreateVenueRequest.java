package com.auditorio.tickets.modules.venue.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVenueRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 300) String address,
        @Min(1) int capacity
) {}
