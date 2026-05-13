package com.auditorio.tickets.modules.reservation.repository;

import com.auditorio.tickets.modules.reservation.model.Reservation;
import com.auditorio.tickets.modules.reservation.model.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    /**
     * Expira atómicamente todas las reservas vencidas y devuelve cuántas fueron afectadas.
     * El service libera luego los event_seats asociados.
     */
    @Modifying
    @Query("""
        UPDATE Reservation r
           SET r.status = com.auditorio.tickets.modules.reservation.model.ReservationStatus.EXPIRED
         WHERE r.status = com.auditorio.tickets.modules.reservation.model.ReservationStatus.PENDING
           AND r.expiresAt < :now
        """)
    int expirePending(@Param("now") Instant now);
}
