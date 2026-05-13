package com.auditorio.tickets.modules.venue.repository;

import com.auditorio.tickets.modules.venue.model.Venue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VenueRepository extends JpaRepository<Venue, UUID> {
}
