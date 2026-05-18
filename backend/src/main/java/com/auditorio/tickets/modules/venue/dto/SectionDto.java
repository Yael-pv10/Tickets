package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Point;
import com.auditorio.tickets.modules.venue.model.Section;

import java.util.List;
import java.util.UUID;

public record SectionDto(
        UUID id,
        UUID venueId,
        String name,
        String type,
        List<Point> shape,
        Integer capacity,
        long seatCount
) {
    public static SectionDto fromEntity(Section s, long seatCount) {
        return new SectionDto(
                s.getId(),
                s.getVenue().getId(),
                s.getName(),
                s.getType().name(),
                s.getShape(),
                s.getCapacity(),
                seatCount
        );
    }
}
