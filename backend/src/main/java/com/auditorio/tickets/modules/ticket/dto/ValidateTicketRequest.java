package com.auditorio.tickets.modules.ticket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ValidateTicketRequest(
        @NotBlank @Size(max = 512) String qrPayload
) {}
