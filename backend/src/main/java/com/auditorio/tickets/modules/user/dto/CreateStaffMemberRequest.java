package com.auditorio.tickets.modules.user.dto;

import com.auditorio.tickets.modules.user.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Petición del admin para crear un nuevo miembro del equipo (STAFF o ADMIN).
 * No se permite crear cuentas CLIENT por esta vía — esas vienen por auto-registro.
 */
public record CreateStaffMemberRequest(
        @Email @NotBlank @Size(max = 320) String email,
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotNull Role role
) {}
