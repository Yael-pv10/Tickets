package com.auditorio.tickets.modules.reservation.service;

import com.auditorio.tickets.common.audit.AuditService;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.event.model.Event;
import com.auditorio.tickets.modules.event.model.EventSeat;
import com.auditorio.tickets.modules.event.model.EventSeatStatus;
import com.auditorio.tickets.modules.event.model.EventStatus;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.reservation.dto.CreateReservationRequest;
import com.auditorio.tickets.modules.reservation.dto.ReservationDto;
import com.auditorio.tickets.modules.reservation.dto.ReservationItemDto;
import com.auditorio.tickets.modules.reservation.model.Reservation;
import com.auditorio.tickets.modules.reservation.model.ReservationStatus;
import com.auditorio.tickets.modules.reservation.repository.ReservationRepository;
import com.auditorio.tickets.modules.user.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final EventSeatRepository eventSeatRepository;
    private final EventRepository eventRepository;
    private final AuditService auditService;

    @Value("${app.reservation.ttl-minutes:10}")
    private int ttlMinutes;

    public ReservationService(ReservationRepository reservationRepository,
                              EventSeatRepository eventSeatRepository,
                              EventRepository eventRepository,
                              AuditService auditService) {
        this.reservationRepository = reservationRepository;
        this.eventSeatRepository = eventSeatRepository;
        this.eventRepository = eventRepository;
        this.auditService = auditService;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservationDto create(CreateReservationRequest request, User currentUser,
                                 String ip, String userAgent) {
        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new ResourceNotFoundException("Evento no encontrado"));
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new BusinessException("El evento no está disponible para reservas");
        }
        if (event.getStartsAt().isBefore(Instant.now())) {
            throw new BusinessException("El evento ya comenzó");
        }

        // Ordenar IDs para evitar deadlocks entre transacciones concurrentes
        List<UUID> sortedIds = request.eventSeatIds().stream()
                .sorted(Comparator.naturalOrder())
                .distinct()
                .toList();

        if (sortedIds.size() != request.eventSeatIds().size()) {
            throw new BusinessException("Hay asientos duplicados en la selección");
        }

        Instant expiresAt = Instant.now().plus(ttlMinutes, ChronoUnit.MINUTES);
        Reservation reservation = Reservation.builder()
                .user(currentUser)
                .event(event)
                .status(ReservationStatus.PENDING)
                .expiresAt(expiresAt)
                .totalCents(0)
                .build();
        reservationRepository.save(reservation);
        reservationRepository.flush(); // necesitamos el id para enlazar

        int total = 0;
        for (UUID eventSeatId : sortedIds) {
            // SELECT ... FOR UPDATE: bloquea la fila hasta el commit.
            EventSeat seat = eventSeatRepository.findByIdForUpdate(eventSeatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Asiento no encontrado: " + eventSeatId));

            if (!seat.getEvent().getId().equals(event.getId())) {
                throw new BusinessException("El asiento no pertenece al evento");
            }
            if (seat.getStatus() != EventSeatStatus.AVAILABLE) {
                throw new BusinessException("El asiento " + seat.getSeat().getSeatCode() + " no está disponible");
            }

            seat.setStatus(EventSeatStatus.LOCKED);
            seat.setLockedUntil(expiresAt);
            seat.setLockedBy(currentUser);
            seat.setReservation(reservation);
            total += seat.getPriceCents();
        }

        reservation.setTotalCents(total);
        reservationRepository.save(reservation);

        auditService.log(currentUser.getId(), "RESERVATION_CREATED", "reservations",
                reservation.getId().toString(), ip, userAgent, null);

        return toDto(reservation);
    }

    public ReservationDto get(UUID id, User currentUser) {
        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reserva no encontrada"));
        if (!r.getUser().getId().equals(currentUser.getId())) {
            throw new ResourceNotFoundException("Reserva no encontrada");
        }
        return toDto(r);
    }

    @Transactional
    public void cancel(UUID id, User currentUser, String ip, String userAgent) {
        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reserva no encontrada"));
        if (!r.getUser().getId().equals(currentUser.getId())) {
            throw new ResourceNotFoundException("Reserva no encontrada");
        }
        if (r.getStatus() != ReservationStatus.PENDING) {
            throw new BusinessException("Solo se pueden cancelar reservas pendientes");
        }
        releaseSeats(r);
        r.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(r);
        auditService.log(currentUser.getId(), "RESERVATION_CANCELLED", "reservations",
                r.getId().toString(), ip, userAgent, null);
    }

    /**
     * Llamado por el job de limpieza. Libera los asientos de las reservas marcadas como EXPIRED.
     */
    @Transactional
    public int releaseExpiredReservations() {
        int expired = reservationRepository.expirePending(Instant.now());
        if (expired > 0) {
            // un UPDATE masivo libera todos los asientos cuyas reservas pasaron a EXPIRED
            eventSeatRepository.releaseExpired();
        }
        return expired;
    }

    private void releaseSeats(Reservation r) {
        eventSeatRepository.releaseSeatsOfReservation(r.getId());
    }

    private ReservationDto toDto(Reservation r) {
        List<EventSeat> seats = eventSeatRepository.findByReservationId(r.getId());
        List<ReservationItemDto> items = seats.stream()
                .map(ReservationItemDto::fromEntity)
                .toList();
        return ReservationDto.fromEntity(r, items);
    }
}
