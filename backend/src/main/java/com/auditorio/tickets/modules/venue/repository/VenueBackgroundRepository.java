package com.auditorio.tickets.modules.venue.repository;

import com.auditorio.tickets.modules.venue.model.VenueBackground;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VenueBackgroundRepository extends JpaRepository<VenueBackground, UUID> {
}
