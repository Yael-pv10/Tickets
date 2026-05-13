package com.auditorio.tickets.modules.user.controller;

import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.user.dto.AdminUserDto;
import com.auditorio.tickets.modules.user.dto.UpdateRoleRequest;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Users", description = "Gestión de usuarios y roles")
public class AdminUserController {

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<AdminUserDto> list() {
        return userRepository.findAll().stream().map(AdminUserDto::fromEntity).toList();
    }

    @PutMapping("/{id}/role")
    public AdminUserDto updateRole(@PathVariable UUID id,
                                   @Valid @RequestBody UpdateRoleRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setRole(request.role());
        userRepository.save(user);
        return AdminUserDto.fromEntity(user);
    }
}
