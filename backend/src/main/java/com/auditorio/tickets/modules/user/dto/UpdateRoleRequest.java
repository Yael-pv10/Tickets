package com.auditorio.tickets.modules.user.dto;

import com.auditorio.tickets.modules.user.model.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull Role role) {}
