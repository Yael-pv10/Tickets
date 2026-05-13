package com.auditorio.tickets.modules.venue.dto;

import com.auditorio.tickets.modules.venue.model.Venue;

import java.util.List;
import java.util.UUID;

public record VenueDto(
        UUID id,
        String name,
        String address,
        int capacity,
        List<SectionDto> sections
) {
    public static VenueDto fromEntity(Venue v, List<SectionDto> sections) {
        return new VenueDto(v.getId(), v.getName(), v.getAddress(), v.getCapacity(), sections);
    }
}
