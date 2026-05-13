package com.auditorio.tickets.modules.ticket.controller;

import com.auditorio.tickets.modules.ticket.dto.TicketDto;
import com.auditorio.tickets.modules.ticket.service.TicketService;
import com.auditorio.tickets.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Tickets", description = "Tickets del usuario autenticado")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping("/me")
    public List<TicketDto> listMine(@AuthenticationPrincipal CustomUserDetails principal) {
        return ticketService.listMyTickets(principal.getDomainUser());
    }

    @GetMapping("/{id}")
    public TicketDto get(@PathVariable UUID id,
                         @AuthenticationPrincipal CustomUserDetails principal) {
        return ticketService.getMyTicket(id, principal.getDomainUser());
    }

    @GetMapping(value = "/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQr(@PathVariable UUID id,
                                        @AuthenticationPrincipal CustomUserDetails principal) {
        byte[] png = ticketService.getQrPng(id, principal.getDomainUser());
        return ResponseEntity.ok()
                .header("Cache-Control", "private, no-cache, no-store, must-revalidate")
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }
}
