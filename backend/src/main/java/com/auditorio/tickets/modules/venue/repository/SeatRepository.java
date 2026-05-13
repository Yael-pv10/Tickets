package com.auditorio.tickets.modules.venue.repository;

import com.auditorio.tickets.modules.venue.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SeatRepository extends JpaRepository<Seat, UUID> {

    List<Seat> findBySectionId(UUID sectionId);

    @Query("""
        SELECT s FROM Seat s
        JOIN s.section sec
        WHERE sec.venue.id = :venueId
        ORDER BY sec.name, s.rowLabel, s.seatNumber
        """)
    List<Seat> findByVenueId(@Param("venueId") UUID venueId);

    long countBySectionId(UUID sectionId);
}
