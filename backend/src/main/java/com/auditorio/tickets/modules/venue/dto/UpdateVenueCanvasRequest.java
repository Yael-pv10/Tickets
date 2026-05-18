package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Point;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;

/** Configura el lienzo del auditorio y el polígono del escenario. */
public record UpdateVenueCanvasRequest(
        @Min(200) @Max(10_000) int canvasWidth,
        @Min(200) @Max(10_000) int canvasHeight,
        List<Point> stageShape
) {}
