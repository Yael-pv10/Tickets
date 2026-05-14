package com.auditorio.tickets.modules.ticket.service;

import com.auditorio.tickets.modules.event.model.Event;
import com.auditorio.tickets.modules.event.model.EventStatus;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.ticket.dto.TodayDashboardDto;
import com.auditorio.tickets.modules.ticket.dto.TodayEventDto;
import com.auditorio.tickets.modules.ticket.repository.TicketRepository;
import com.auditorio.tickets.modules.user.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class StaffDashboardService {

    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;

    /** Zona en la que se interpreta "hoy". Configurable vía {@code app.timezone}. */
    @Value("${app.timezone:UTC}")
    private String timezone;

    public StaffDashboardService(EventRepository eventRepository,
                                 TicketRepository ticketRepository) {
        this.eventRepository = eventRepository;
        this.ticketRepository = ticketRepository;
    }

    public TodayDashboardDto getToday(User staff) {
        ZoneId zone = ZoneId.of(timezone);
        LocalDate today = LocalDate.now(zone);
        Instant startOfDay = today.atStartOfDay(zone).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<Event> events = eventRepository.findByStatusAndStartsAtBetweenOrderByStartsAtAsc(
                EventStatus.PUBLISHED, startOfDay, endOfDay);

        List<TodayEventDto> dtos = events.stream()
                .map(e -> new TodayEventDto(
                        e.getId(),
                        e.getTitle(),
                        e.getVenue().getName(),
                        e.getStartsAt(),
                        e.getEndsAt(),
                        ticketRepository.countIssuedByEvent(e.getId()),
                        ticketRepository.countValidatedByEventSince(e.getId(), startOfDay)))
                .toList();

        long myValidationsToday = ticketRepository.countValidatedByStaffSince(staff.getId(), startOfDay);

        return new TodayDashboardDto(dtos, myValidationsToday);
    }
}
