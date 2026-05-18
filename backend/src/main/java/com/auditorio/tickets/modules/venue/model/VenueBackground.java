package com.auditorio.tickets.modules.venue.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Imagen del plano de un auditorio. En tabla aparte de venues para no
 * cargar el blob en cada consulta. La PK es el id del venue (1 a 1).
 */
@Entity
@Table(name = "venue_backgrounds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VenueBackground {

    @Id
    @Column(name = "venue_id")
    private UUID venueId;

    @Column(nullable = false)
    private byte[] image;

    @Column(nullable = false, length = 100)
    private String mime;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
