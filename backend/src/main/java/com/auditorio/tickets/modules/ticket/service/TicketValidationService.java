package com.auditorio.tickets.modules.ticket.service;

import com.auditorio.tickets.common.audit.AuditService;
import com.auditorio.tickets.modules.ticket.dto.ValidationResult;
import com.auditorio.tickets.modules.ticket.model.Ticket;
import com.auditorio.tickets.modules.ticket.model.TicketStatus;
import com.auditorio.tickets.modules.ticket.repository.TicketRepository;
import com.auditorio.tickets.modules.user.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class TicketValidationService {

    private final TicketRepository ticketRepository;
    private final QrCodeService qrCodeService;
    private final AuditService auditService;

    public TicketValidationService(TicketRepository ticketRepository,
                                   QrCodeService qrCodeService,
                                   AuditService auditService) {
        this.ticketRepository = ticketRepository;
        this.qrCodeService = qrCodeService;
        this.auditService = auditService;
    }

    @Transactional
    public ValidationResult validate(String qrPayload, User staff, String ip, String userAgent) {
        // Formato esperado: <UUID>.<base64url-hmac>
        int sep = qrPayload.indexOf('.');
        if (sep <= 0 || sep == qrPayload.length() - 1) {
            audit(staff, "TICKET_VALIDATION_INVALID_FORMAT", null, ip, userAgent);
            return ValidationResult.invalid();
        }

        String codeStr = qrPayload.substring(0, sep);
        String signature = qrPayload.substring(sep + 1);

        UUID code;
        try {
            code = UUID.fromString(codeStr);
        } catch (IllegalArgumentException e) {
            audit(staff, "TICKET_VALIDATION_INVALID_CODE", codeStr, ip, userAgent);
            return ValidationResult.invalid();
        }

        // Verifica firma ANTES de tocar la BD para no filtrar timing
        if (!qrCodeService.verify(codeStr, signature)) {
            audit(staff, "TICKET_VALIDATION_BAD_SIGNATURE", codeStr, ip, userAgent);
            return ValidationResult.invalid();
        }

        Optional<Ticket> opt = ticketRepository.findByCode(code);
        if (opt.isEmpty()) {
            audit(staff, "TICKET_VALIDATION_NOT_FOUND", codeStr, ip, userAgent);
            return ValidationResult.invalid();
        }
        Ticket ticket = opt.get();

        if (ticket.getStatus() == TicketStatus.USED) {
            audit(staff, "TICKET_VALIDATION_DUPLICATE", ticket.getId().toString(), ip, userAgent);
            return ValidationResult.alreadyUsed(
                    ticket.getEventSeat().getSeat().getSeatCode(),
                    ticket.getEventSeat().getEvent().getTitle());
        }
        if (ticket.getStatus() != TicketStatus.PAID) {
            audit(staff, "TICKET_VALIDATION_NOT_PAID", ticket.getId().toString(), ip, userAgent);
            return ValidationResult.invalid();
        }

        // UPDATE atómico: solo pasa si sigue en PAID. Evita doble validación en concurrencia.
        int updated = ticketRepository.markUsedIfPaid(ticket.getId(), staff.getId(), Instant.now());
        if (updated == 0) {
            audit(staff, "TICKET_VALIDATION_RACE_LOST", ticket.getId().toString(), ip, userAgent);
            return ValidationResult.alreadyUsed(
                    ticket.getEventSeat().getSeat().getSeatCode(),
                    ticket.getEventSeat().getEvent().getTitle());
        }

        audit(staff, "TICKET_VALIDATION_OK", ticket.getId().toString(), ip, userAgent);
        return ValidationResult.ok(
                ticket.getUser().getName(),
                ticket.getEventSeat().getSeat().getSeatCode(),
                ticket.getEventSeat().getSeat().getSection().getName(),
                ticket.getEventSeat().getEvent().getTitle()
        );
    }

    private void audit(User staff, String action, String ticketId, String ip, String userAgent) {
        auditService.log(staff.getId(), action, "tickets", ticketId, ip, userAgent, null);
    }
}
