package com.auditorio.tickets.modules.user.controller;

import com.auditorio.tickets.modules.user.dto.AdminUserDto;
import com.auditorio.tickets.modules.user.dto.CreateStaffMemberRequest;
import com.auditorio.tickets.modules.user.dto.UpdateRoleRequest;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import com.auditorio.tickets.modules.user.service.AdminUserService;
import com.auditorio.tickets.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Users", description = "Gestión de usuarios y roles")
public class AdminUserController {

    private final UserRepository userRepository;
    private final AdminUserService adminUserService;

    public AdminUserController(UserRepository userRepository, AdminUserService adminUserService) {
        this.userRepository = userRepository;
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public List<AdminUserDto> list() {
        return userRepository.findAll().stream().map(AdminUserDto::fromEntity).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto create(@Valid @RequestBody CreateStaffMemberRequest request,
                               @AuthenticationPrincipal CustomUserDetails principal,
                               HttpServletRequest http) {
        return adminUserService.createTeamMember(
                request, principal.getDomainUser(), clientIp(http), userAgent(http));
    }

    @PutMapping("/{id}/role")
    public AdminUserDto updateRole(@PathVariable UUID id,
                                   @Valid @RequestBody UpdateRoleRequest request,
                                   @AuthenticationPrincipal CustomUserDetails principal,
                                   HttpServletRequest http) {
        return adminUserService.changeRole(
                id, request.role(), principal.getDomainUser(), clientIp(http), userAgent(http));
    }

    private String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private String userAgent(HttpServletRequest req) {
        String ua = req.getHeader("User-Agent");
        return ua == null ? null : ua.substring(0, Math.min(ua.length(), 300));
    }
}
