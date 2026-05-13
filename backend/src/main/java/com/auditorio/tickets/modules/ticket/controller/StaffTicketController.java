package com.auditorio.tickets.modules.ticket.controller;

import com.auditorio.tickets.modules.ticket.dto.ValidateTicketRequest;
import com.auditorio.tickets.modules.ticket.dto.ValidationResult;
import com.auditorio.tickets.modules.ticket.service.TicketValidationService;
import com.auditorio.tickets.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff")
@PreAuthorize("hasAnyRole('STAFF','ADMIN')")
@Tag(name = "Staff", description = "Validación de tickets en la entrada")
public class StaffTicketController {

    private final TicketValidationService validationService;

    public StaffTicketController(TicketValidationService validationService) {
        this.validationService = validationService;
    }

    @PostMapping("/validate")
    public ValidationResult validate(@Valid @RequestBody ValidateTicketRequest request,
                                     @AuthenticationPrincipal CustomUserDetails principal,
                                     HttpServletRequest http) {
        return validationService.validate(
                request.qrPayload(),
                principal.getDomainUser(),
                clientIp(http),
                userAgent(http)
        );
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
