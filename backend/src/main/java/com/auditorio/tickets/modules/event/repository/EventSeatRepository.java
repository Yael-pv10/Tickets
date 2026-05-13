package com.auditorio.tickets.modules.event.repository;

import com.auditorio.tickets.modules.event.model.EventSeat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventSeatRepository extends JpaRepository<EventSeat, UUID> {

    List<EventSeat> findByEventId(UUID eventId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT es FROM EventSeat es WHERE es.id = :id")
    Optional<EventSeat> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Crea un EventSeat por cada Seat del venue, con precio por defecto.
     * Usa INSERT...SELECT nativo: una sola sentencia, evita N+1.
     */
    @Modifying
    @Query(value = """
            INSERT INTO event_seats (id, event_id, seat_id, price_cents, status, version, created_at, updated_at)
            SELECT gen_random_uuid(), :eventId, s.id, :defaultPriceCents, 'AVAILABLE', 0, NOW(), NOW()
            FROM seats s
            JOIN sections sec ON sec.id = s.section_id
            WHERE sec.venue_id = :venueId
            ON CONFLICT (event_id, seat_id) DO NOTHING
            """, nativeQuery = true)
    int seedFromVenue(@Param("eventId") UUID eventId,
                      @Param("venueId") UUID venueId,
                      @Param("defaultPriceCents") int defaultPriceCents);

    List<EventSeat> findByReservationId(UUID reservationId);

    /** Libera los asientos de una reserva (cancelación explícita). */
    @Modifying
    @Query("""
        UPDATE EventSeat es
           SET es.status = com.auditorio.tickets.modules.event.model.EventSeatStatus.AVAILABLE,
               es.lockedUntil = NULL,
               es.lockedBy = NULL,
               es.reservation = NULL
         WHERE es.reservation.id = :reservationId
           AND es.status = com.auditorio.tickets.modules.event.model.EventSeatStatus.LOCKED
        """)
    int releaseSeatsOfReservation(@Param("reservationId") UUID reservationId);

    /** Libera asientos cuya reserva ya fue marcada EXPIRED. */
    @Modifying
    @Query("""
        UPDATE EventSeat es
           SET es.status = com.auditorio.tickets.modules.event.model.EventSeatStatus.AVAILABLE,
               es.lockedUntil = NULL,
               es.lockedBy = NULL,
               es.reservation = NULL
         WHERE es.status = com.auditorio.tickets.modules.event.model.EventSeatStatus.LOCKED
           AND es.reservation.status = com.auditorio.tickets.modules.reservation.model.ReservationStatus.EXPIRED
        """)
    int releaseExpired();
}
