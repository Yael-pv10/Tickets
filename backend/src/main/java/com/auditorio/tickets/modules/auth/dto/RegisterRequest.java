package com.auditorio.tickets.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email(message = "Email inválido")
        @NotBlank
        @Size(max = 320)
        String email,

        @NotBlank
        @Size(min = 8, max = 128, message = "La contraseña debe tener 8-128 caracteres")
        @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "La contraseña debe tener al menos una mayúscula, una minúscula, un número y un símbolo"
        )
        String password,

        @NotBlank
        @Size(min = 2, max = 120)
        String name
) {}
