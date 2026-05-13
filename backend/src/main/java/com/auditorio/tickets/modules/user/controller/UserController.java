package com.auditorio.tickets.modules.user.controller;

import com.auditorio.tickets.modules.auth.dto.AuthResponse;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Información del usuario autenticado")
public class UserController {

    @GetMapping("/me")
    public AuthResponse.UserSummary me(@AuthenticationPrincipal CustomUserDetails principal) {
        User u = principal.getDomainUser();
        return new AuthResponse.UserSummary(u.getId(), u.getEmail(), u.getName(), u.getRole().name());
    }
}
