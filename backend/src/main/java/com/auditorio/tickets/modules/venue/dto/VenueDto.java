package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Point;
import com.auditorio.tickets.modules.venue.model.Venue;

import java.util.List;
import java.util.UUID;

public record VenueDto(
        UUID id,
        String name,
        String address,
        int capacity,
        int canvasWidth,
        int canvasHeight,
        List<Point> stageShape,
        List<SectionDto> sections
) {
    public static VenueDto fromEntity(Venue v, List<SectionDto> sections) {
        return new VenueDto(
                v.getId(),
                v.getName(),
                v.getAddress(),
                v.getCapacity(),
                v.getCanvasWidth(),
                v.getCanvasHeight(),
                v.getStageShape(),
                sections
        );
    }
}
