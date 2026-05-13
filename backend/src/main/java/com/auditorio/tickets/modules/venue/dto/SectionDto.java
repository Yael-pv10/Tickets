package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Section;

import java.util.UUID;

public record SectionDto(
        UUID id,
        UUID venueId,
        String name,
        long seatCount
) {
    public static SectionDto fromEntity(Section s, long seatCount) {
        return new SectionDto(s.getId(), s.getVenue().getId(), s.getName(), seatCount);
    }
}
