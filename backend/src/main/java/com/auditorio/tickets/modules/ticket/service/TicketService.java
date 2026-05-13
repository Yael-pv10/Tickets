package com.auditorio.tickets.modules.ticket.service;

import com.auditorio.tickets.common.audit.AuditService;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.event.model.EventSeat;
import com.auditorio.tickets.modules.event.model.EventSeatStatus;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.reservation.model.Reservation;
import com.auditorio.tickets.modules.reservation.model.ReservationStatus;
import com.auditorio.tickets.modules.reservation.repository.ReservationRepository;
import com.auditorio.tickets.modules.ticket.dto.TicketDto;
import com.auditorio.tickets.modules.ticket.model.Ticket;
import com.auditorio.tickets.modules.ticket.model.TicketStatus;
import com.auditorio.tickets.modules.ticket.repository.TicketRepository;
import com.auditorio.tickets.modules.user.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ReservationRepository reservationRepository;
    private final EventSeatRepository eventSeatRepository;
    private final QrCodeService qrCodeService;
    private final AuditService auditService;

    public TicketService(TicketRepository ticketRepository,
                         ReservationRepository reservationRepository,
                         EventSeatRepository eventSeatRepository,
                         QrCodeService qrCodeService,
                         AuditService auditService) {
        this.ticketRepository = ticketRepository;
        this.reservationRepository = reservationRepository;
        this.eventSeatRepository = eventSeatRepository;
        this.qrCodeService = qrCodeService;
        this.auditService = auditService;
    }

    /**
     * Confirma una reserva: marca los asientos como SOLD y emite un Ticket por asiento.
     * En esta fase el pago es simulado; en producción se llamaría desde el webhook del PSP
     * verificando la firma del proveedor antes de invocar este método.
     */
    @Transactional
    public List<TicketDto> confirmReservation(UUID reservationId, User currentUser,
                                              String paymentRef, String ip, String userAgent) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reserva no encontrada"));

        if (!reservation.getUser().getId().equals(currentUser.getId())) {
            throw new ResourceNotFoundException("Reserva no encontrada");
        }
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new BusinessException("La reserva no está en estado pendiente");
        }
        if (reservation.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("La reserva expiró");
        }

        List<EventSeat> seats = eventSeatRepository.findByReservationId(reservationId);
        if (seats.isEmpty()) {
            throw new BusinessException("La reserva no tiene asientos asociados");
        }

        List<Ticket> created = new ArrayList<>(seats.size());
        for (EventSeat seat : seats) {
            if (seat.getStatus() != EventSeatStatus.LOCKED) {
                throw new BusinessException("Asiento " + seat.getSeat().getSeatCode()
                        + " ya no está bloqueado por la reserva");
            }
            seat.setStatus(EventSeatStatus.SOLD);
            seat.setLockedUntil(null);
            seat.setLockedBy(null);

            UUID code = UUID.randomUUID();
            String signature = qrCodeService.sign(code.toString());
            Ticket ticket = Ticket.builder()
                    .eventSeat(seat)
                    .user(currentUser)
                    .code(code)
                    .qrSignature(signature)
                    .status(TicketStatus.PAID)
                    .issuedAt(Instant.now())
                    .paymentRef(paymentRef)
                    .build();
            ticketRepository.save(ticket);
            created.add(ticket);
        }

        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setConfirmedAt(Instant.now());
        reservationRepository.save(reservation);

        auditService.log(currentUser.getId(), "RESERVATION_CONFIRMED", "reservations",
                reservation.getId().toString(), ip, userAgent, null);

        return created.stream().map(TicketDto::fromEntity).toList();
    }

    public List<TicketDto> listMyTickets(User currentUser) {
        return ticketRepository.findByUserIdOrderByIssuedAtDesc(currentUser.getId()).stream()
                .map(TicketDto::fromEntity)
                .toList();
    }

    public TicketDto getMyTicket(UUID id, User currentUser) {
        Ticket t = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket no encontrado"));
        if (!t.getUser().getId().equals(currentUser.getId())) {
            throw new ResourceNotFoundException("Ticket no encontrado");
        }
        return TicketDto.fromEntity(t);
    }

    public byte[] getQrPng(UUID ticketId, User currentUser) {
        Ticket t = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket no encontrado"));
        if (!t.getUser().getId().equals(currentUser.getId())) {
            throw new ResourceNotFoundException("Ticket no encontrado");
        }
        String payload = t.getCode().toString() + "." + t.getQrSignature();
        return qrCodeService.generatePng(payload, 320);
    }
}
