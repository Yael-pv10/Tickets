package com.auditorio.tickets.modules.event.model;

import com.auditorio.tickets.common.audit.AuditEntity;
import com.auditorio.tickets.modules.reservation.model.Reservation;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.venue.model.Seat;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_event_seat", columnNames = {"event_id", "seat_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventSeat extends AuditEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Column(name = "price_cents", nullable = false)
    private int priceCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EventSeatStatus status = EventSeatStatus.AVAILABLE;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by_user_id")
    private User lockedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @Version
    @Column(nullable = false)
    private long version;
}
