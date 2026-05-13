package com.auditorio.tickets.modules.event.repository;

import com.auditorio.tickets.modules.event.model.Event;
import com.auditorio.tickets.modules.event.model.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {
    Page<Event> findByStatusAndStartsAtAfterOrderByStartsAtAsc(
            EventStatus status, Instant after, Pageable pageable);
}
