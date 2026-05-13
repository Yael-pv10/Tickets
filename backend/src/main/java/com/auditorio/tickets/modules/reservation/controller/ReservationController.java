package com.auditorio.tickets.modules.reservation.controller;

import com.auditorio.tickets.modules.reservation.dto.CreateReservationRequest;
import com.auditorio.tickets.modules.reservation.dto.ReservationDto;
import com.auditorio.tickets.modules.reservation.service.ReservationService;
import com.auditorio.tickets.modules.ticket.dto.TicketDto;
import com.auditorio.tickets.modules.ticket.service.TicketService;
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
@RequestMapping("/api/reservations")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Reservations", description = "Reservas temporales con TTL de asientos")
public class ReservationController {

    private final ReservationService reservationService;
    private final TicketService ticketService;

    public ReservationController(ReservationService reservationService,
                                 TicketService ticketService) {
        this.reservationService = reservationService;
        this.ticketService = ticketService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationDto create(@Valid @RequestBody CreateReservationRequest request,
                                 @AuthenticationPrincipal CustomUserDetails principal,
                                 HttpServletRequest http) {
        return reservationService.create(request, principal.getDomainUser(), clientIp(http), userAgent(http));
    }

    @GetMapping("/{id}")
    public ReservationDto get(@PathVariable UUID id,
                              @AuthenticationPrincipal CustomUserDetails principal) {
        return reservationService.get(id, principal.getDomainUser());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable UUID id,
                       @AuthenticationPrincipal CustomUserDetails principal,
                       HttpServletRequest http) {
        reservationService.cancel(id, principal.getDomainUser(), clientIp(http), userAgent(http));
    }

    /**
     * Confirma la reserva como pagada y emite tickets. En esta versión el pago es simulado;
     * en producción esto se llamaría desde el webhook del PSP tras verificar la firma.
     */
    @PostMapping("/{id}/confirm")
    public List<TicketDto> confirm(@PathVariable UUID id,
                                   @AuthenticationPrincipal CustomUserDetails principal,
                                   HttpServletRequest http) {
        String mockPaymentRef = "MOCK-" + UUID.randomUUID();
        return ticketService.confirmReservation(id, principal.getDomainUser(),
                mockPaymentRef, clientIp(http), userAgent(http));
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
