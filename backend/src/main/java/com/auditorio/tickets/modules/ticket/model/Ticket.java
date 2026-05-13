package com.auditorio.tickets.modules.ticket.model;

import com.auditorio.tickets.common.audit.AuditEntity;
import com.auditorio.tickets.modules.event.model.EventSeat;
import com.auditorio.tickets.modules.user.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tickets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tickets_code", columnNames = "code"),
        @UniqueConstraint(name = "uk_tickets_event_seat", columnNames = "event_seat_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket extends AuditEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_seat_id", nullable = false)
    private EventSeat eventSeat;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    @Builder.Default
    private UUID code = UUID.randomUUID();

    @Column(name = "qr_signature", nullable = false, length = 512)
    private String qrSignature;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TicketStatus status = TicketStatus.PAID;

    @Column(name = "issued_at", nullable = false)
    @Builder.Default
    private Instant issuedAt = Instant.now();

    @Column(name = "used_at")
    private Instant usedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_by_staff_id")
    private User usedByStaff;

    @Column(name = "payment_ref", length = 200)
    private String paymentRef;
}
