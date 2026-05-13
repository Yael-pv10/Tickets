package com.auditorio.tickets.modules.venue.model;

import com.auditorio.tickets.common.audit.AuditEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.util.UUID;

@Entity
@Table(name = "seats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat extends AuditEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @Column(name = "row_label", nullable = false, length = 5)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private int seatNumber;

    /**
     * Columna generada por PostgreSQL: row_label || seat_number.
     * Hibernate la lee tras INSERT pero no la inserta.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "seat_code", insertable = false, updatable = false, length = 10)
    private String seatCode;
}
