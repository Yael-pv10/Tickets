package com.auditorio.tickets.modules.user.dto;

import com.auditorio.tickets.modules.user.model.User;

import java.time.Instant;
import java.util.UUID;

public record AdminUserDto(
        UUID id,
        String email,
        String name,
        String role,
        boolean enabled,
        Instant createdAt
) {
    public static AdminUserDto fromEntity(User u) {
        return new AdminUserDto(
                u.getId(),
                u.getEmail(),
                u.getName(),
                u.getRole().name(),
                u.isEnabled(),
                u.getCreatedAt()
        );
    }
}
