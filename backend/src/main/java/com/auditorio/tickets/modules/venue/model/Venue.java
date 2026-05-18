package com.auditorio.tickets.modules.venue.model;

import com.auditorio.tickets.common.audit.AuditEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "venues")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Venue extends AuditEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 300)
    private String address;

    @Column(nullable = false)
    private int capacity;

    /** Dimensiones del lienzo donde se dibuja el mapa del auditorio. */
    @Column(name = "canvas_width", nullable = false)
    @Builder.Default
    private int canvasWidth = 1200;

    @Column(name = "canvas_height", nullable = false)
    @Builder.Default
    private int canvasHeight = 800;

    /** Polígono del escenario sobre el lienzo (null si aún no se dibuja). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stage_shape", columnDefinition = "jsonb")
    private List<Point> stageShape;

    @OneToMany(mappedBy = "venue", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Section> sections = new ArrayList<>();
}
