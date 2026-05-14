package com.auditorio.tickets.modules.reservation.service;

import com.auditorio.tickets.AbstractIntegrationTest;
import com.auditorio.tickets.common.audit.AuditLogRepository;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.modules.event.model.Event;
import com.auditorio.tickets.modules.event.model.EventSeat;
import com.auditorio.tickets.modules.event.model.EventSeatStatus;
import com.auditorio.tickets.modules.event.model.EventStatus;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.reservation.model.Reservation;
import com.auditorio.tickets.modules.reservation.model.ReservationStatus;
import com.auditorio.tickets.modules.reservation.repository.ReservationRepository;
import com.auditorio.tickets.modules.ticket.repository.TicketRepository;
import com.auditorio.tickets.modules.ticket.service.TicketService;
import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import com.auditorio.tickets.modules.venue.model.Seat;
import com.auditorio.tickets.modules.venue.model.Section;
import com.auditorio.tickets.modules.venue.model.Venue;
import com.auditorio.tickets.modules.venue.repository.SeatRepository;
import com.auditorio.tickets.modules.venue.repository.SectionRepository;
import com.auditorio.tickets.modules.venue.repository.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for CU-X1: el job de limpieza expira reservas vencidas y libera los asientos.
 *
 * Cubre tres invariantes del flujo de reservación:
 *   1. Una reserva PENDING con expires_at en el pasado pasa a EXPIRED y su EventSeat vuelve a AVAILABLE.
 *   2. Una reserva PENDING con expires_at futuro NO se toca.
 *   3. TicketService.confirmReservation rechaza una reserva expirada incluso si el job todavía no la procesó —
 *      ésta es la defensa que evita doble-uso si un cliente confirma en el límite.
 */
class ReservationExpirationIntegrationTest extends AbstractIntegrationTest {

    @Autowired ReservationService reservationService;
    @Autowired TicketService ticketService;
    @Autowired UserRepository userRepository;
    @Autowired VenueRepository venueRepository;
    @Autowired SectionRepository sectionRepository;
    @Autowired SeatRepository seatRepository;
    @Autowired EventRepository eventRepository;
    @Autowired EventSeatRepository eventSeatRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired TicketRepository ticketRepository;
    @Autowired AuditLogRepository auditLogRepository;

    private User testUser;
    private Event testEvent;
    private EventSeat testEventSeat;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        testUser = userRepository.save(User.builder()
                .email("client@test.local")
                .passwordHash("$2a$12$dummyHashForTestingOnlyNotARealBcryptValue")
                .name("Cliente Test")
                .role(Role.CLIENT)
                .enabled(true)
                .build());

        Venue venue = venueRepository.save(Venue.builder()
                .name("Sala Principal")
                .address("Av. Test 123")
                .capacity(100)
                .build());

        Section section = sectionRepository.save(Section.builder()
                .venue(venue)
                .name("Platea")
                .build());

        // saveAndFlush para que PostgreSQL genere seat_code (columna GENERATED) y Hibernate la lea.
        Seat seat = seatRepository.saveAndFlush(Seat.builder()
                .section(section)
                .rowLabel("A")
                .seatNumber(1)
                .build());

        testEvent = eventRepository.save(Event.builder()
                .venue(venue)
                .title("Concierto de prueba")
                .startsAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .status(EventStatus.PUBLISHED)
                .build());

        testEventSeat = eventSeatRepository.save(EventSeat.builder()
                .event(testEvent)
                .seat(seat)
                .priceCents(5000)
                .status(EventSeatStatus.AVAILABLE)
                .build());
    }

    @Test
    @DisplayName("releaseExpiredReservations: una reserva vencida pasa a EXPIRED y libera su asiento")
    void releaseExpiredReservations_expiresPastReservationAndReleasesSeat() {
        Reservation reservation = createPendingReservation(Instant.now().minus(1, ChronoUnit.MINUTES));
        lockSeatForReservation(testEventSeat, reservation);

        int expired = reservationService.releaseExpiredReservations();

        assertThat(expired).isEqualTo(1);

        Reservation refreshedReservation = reservationRepository.findById(reservation.getId()).orElseThrow();
        assertThat(refreshedReservation.getStatus()).isEqualTo(ReservationStatus.EXPIRED);

        EventSeat refreshedSeat = eventSeatRepository.findById(testEventSeat.getId()).orElseThrow();
        assertThat(refreshedSeat.getStatus()).isEqualTo(EventSeatStatus.AVAILABLE);
        assertThat(refreshedSeat.getLockedUntil()).isNull();
        assertThat(refreshedSeat.getLockedBy()).isNull();
        assertThat(refreshedSeat.getReservation()).isNull();
    }

    @Test
    @DisplayName("releaseExpiredReservations: no toca reservas pendientes con expiración futura")
    void releaseExpiredReservations_doesNotTouchActiveReservation() {
        Reservation reservation = createPendingReservation(Instant.now().plus(5, ChronoUnit.MINUTES));
        lockSeatForReservation(testEventSeat, reservation);

        int expired = reservationService.releaseExpiredReservations();

        assertThat(expired).isEqualTo(0);

        Reservation refreshedReservation = reservationRepository.findById(reservation.getId()).orElseThrow();
        assertThat(refreshedReservation.getStatus()).isEqualTo(ReservationStatus.PENDING);

        EventSeat refreshedSeat = eventSeatRepository.findById(testEventSeat.getId()).orElseThrow();
        assertThat(refreshedSeat.getStatus()).isEqualTo(EventSeatStatus.LOCKED);
        assertThat(refreshedSeat.getReservation()).isNotNull();
    }

    @Test
    @DisplayName("confirmReservation: rechaza una reserva expirada antes de que el job la procese")
    void confirmReservation_rejectsExpiredReservationBeforeJobRuns() {
        // Reserva con expiresAt en el pasado, pero el job aún NO ha corrido: status sigue PENDING.
        // Esta es la ventana donde la defensa en TicketService.confirmReservation debe actuar.
        Reservation reservation = createPendingReservation(Instant.now().minus(1, ChronoUnit.MINUTES));
        lockSeatForReservation(testEventSeat, reservation);

        assertThatThrownBy(() -> ticketService.confirmReservation(
                reservation.getId(), testUser, "MOCK-test", "127.0.0.1", "test-agent"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expiró");

        // El estado de la reserva no cambia por la llamada fallida; el job es quien decide expirarla.
        Reservation refreshedReservation = reservationRepository.findById(reservation.getId()).orElseThrow();
        assertThat(refreshedReservation.getStatus()).isEqualTo(ReservationStatus.PENDING);

        // No se emitieron tickets.
        assertThat(ticketRepository.findByUserIdOrderByIssuedAtDesc(testUser.getId())).isEmpty();
    }

    @AfterEach
    void tearDown() {
        // Limpiar tras de sí para no bloquear el deleteAll(users) de otras clases de test
        // que solo limpian auth-related (refresh_tokens, audit_log, users).
        cleanDatabase();
    }

    private void cleanDatabase() {
        // Orden por dependencias FK. audit_log.user_id es NO ACTION → debe limpiarse antes que users.
        ticketRepository.deleteAll();
        eventSeatRepository.deleteAll();
        reservationRepository.deleteAll();
        eventRepository.deleteAll();
        seatRepository.deleteAll();
        sectionRepository.deleteAll();
        venueRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.deleteAll();
    }

    private Reservation createPendingReservation(Instant expiresAt) {
        return reservationRepository.save(Reservation.builder()
                .user(testUser)
                .event(testEvent)
                .status(ReservationStatus.PENDING)
                .expiresAt(expiresAt)
                .totalCents(5000)
                .build());
    }

    private void lockSeatForReservation(EventSeat seat, Reservation reservation) {
        seat.setStatus(EventSeatStatus.LOCKED);
        seat.setLockedUntil(reservation.getExpiresAt());
        seat.setLockedBy(testUser);
        seat.setReservation(reservation);
        eventSeatRepository.save(seat);
    }
}
