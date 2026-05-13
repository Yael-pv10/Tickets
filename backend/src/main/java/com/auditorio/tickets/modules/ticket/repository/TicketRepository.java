package com.auditorio.tickets.modules.ticket.repository;

import com.auditorio.tickets.modules.ticket.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    Optional<Ticket> findByCode(UUID code);

    List<Ticket> findByUserIdOrderByIssuedAtDesc(UUID userId);

    /**
     * UPDATE atómico: marca un ticket como USED solo si está PAID.
     * Devuelve filas afectadas. Si 0 → ya estaba usado, cancelado o no existe.
     */
    @Modifying
    @Query("""
        UPDATE Ticket t
           SET t.status = com.auditorio.tickets.modules.ticket.model.TicketStatus.USED,
               t.usedAt = :now,
               t.usedByStaff.id = :staffId
         WHERE t.id = :id
           AND t.status = com.auditorio.tickets.modules.ticket.model.TicketStatus.PAID
        """)
    int markUsedIfPaid(@Param("id") UUID id,
                       @Param("staffId") UUID staffId,
                       @Param("now") Instant now);
}
