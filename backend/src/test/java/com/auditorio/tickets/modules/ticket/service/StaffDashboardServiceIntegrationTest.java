package com.auditorio.tickets.modules.ticket.service;

import com.auditorio.tickets.AbstractIntegrationTest;
import com.auditorio.tickets.common.audit.AuditLogRepository;
import com.auditorio.tickets.modules.event.model.Event;
import com.auditorio.tickets.modules.event.model.EventSeat;
import com.auditorio.tickets.modules.event.model.EventSeatStatus;
import com.auditorio.tickets.modules.event.model.EventStatus;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
import com.auditorio.tickets.modules.ticket.dto.TodayDashboardDto;
import com.auditorio.tickets.modules.ticket.dto.TodayEventDto;
import com.auditorio.tickets.modules.ticket.model.Ticket;
import com.auditorio.tickets.modules.ticket.model.TicketStatus;
import com.auditorio.tickets.modules.ticket.repository.TicketRepository;
import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import com.auditorio.tickets.modules.venue.model.Seat;
import com.auditorio.tickets.modules.venue.model.Section;
import com.auditorio.tickets.modules.venue.model.Venue;
import com.auditorio.tickets.modules.venue.repository.SeatRepository;
import com.auditorio.tickets.modules.venue.repository.SectionRepository;
import com.auditorio.tickets.modules.venue.repository.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for CU-S5: el panel del día devuelve eventos de hoy, contadores
 * de boletos emitidos y validados, y las validaciones del propio staff.
 *
 * El servicio interpreta "hoy" con {@code app.timezone}; el test usa UTC para que
 * los rangos sean reproducibles independientemente del entorno.
 */
class StaffDashboardServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired StaffDashboardService staffDashboardService;
    @Autowired UserRepository userRepository;
    @Autowired VenueRepository venueRepository;
    @Autowired SectionRepository sectionRepository;
    @Autowired SeatRepository seatRepository;
    @Autowired EventRepository eventRepository;
    @Autowired EventSeatRepository eventSeatRepository;
    @Autowired TicketRepository ticketRepository;
    @Autowired AuditLogRepository auditLogRepository;

    private User staff;
    private User otherStaff;
    private User attendee;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        staff = userRepository.save(User.builder()
                .email("staff@test.local")
                .passwordHash("$2a$12$dummy")
                .name("Staff Test")
                .role(Role.STAFF)
                .enabled(true)
                .build());

        otherStaff = userRepository.save(User.builder()
                .email("otherstaff@test.local")
                .passwordHash("$2a$12$dummy")
                .name("Otro Staff")
                .role(Role.STAFF)
                .enabled(true)
                .build());

        attendee = userRepository.save(User.builder()
                .email("attendee@test.local")
                .passwordHash("$2a$12$dummy")
                .name("Asistente")
                .role(Role.CLIENT)
                .enabled(true)
                .build());
    }

    @Test
    @DisplayName("getToday: incluye solo eventos PUBLISHED cuyo inicio cae hoy")
    void getToday_includesOnlyTodayPublishedEvents() {
        // Instante a mediodía UTC de hoy — siempre dentro del día.
        Instant todayNoonUtc = LocalDate.now(ZoneId.of("UTC")).atTime(12, 0).atZone(ZoneId.of("UTC")).toInstant();

        Event eventToday = createEvent("Función de hoy", todayNoonUtc, EventStatus.PUBLISHED);
        Event eventTomorrow = createEvent("Función mañana",
                todayNoonUtc.plus(1, ChronoUnit.DAYS), EventStatus.PUBLISHED);
        // Borrador hoy: no debe aparecer.
        createEvent("Borrador hoy", todayNoonUtc.plus(2, ChronoUnit.HOURS), EventStatus.DRAFT);

        TodayDashboardDto result = staffDashboardService.getToday(staff);

        assertThat(result.events()).hasSize(1);
        TodayEventDto only = result.events().get(0);
        assertThat(only.id()).isEqualTo(eventToday.getId());
        assertThat(only.id()).isNotEqualTo(eventTomorrow.getId());
        assertThat(only.title()).isEqualTo("Función de hoy");
        assertThat(only.issuedCount()).isZero();
        assertThat(only.validatedCount()).isZero();
        assertThat(result.myValidationsToday()).isZero();
    }

    @Test
    @DisplayName("getToday: cuenta boletos emitidos (PAID o USED) y validaciones del día por evento")
    void getToday_countsIssuedAndValidatedTicketsPerEvent() {
        Instant todayNoonUtc = LocalDate.now(ZoneId.of("UTC")).atTime(12, 0).atZone(ZoneId.of("UTC")).toInstant();
        Event event = createEvent("Concierto", todayNoonUtc, EventStatus.PUBLISHED);

        // 3 boletos: 2 PAID (no usados), 1 USED hoy.
        EventSeat seat1 = createSeat(event, "A", 1);
        EventSeat seat2 = createSeat(event, "A", 2);
        EventSeat seat3 = createSeat(event, "A", 3);

        createTicket(seat1, attendee, TicketStatus.PAID, null, null);
        createTicket(seat2, attendee, TicketStatus.PAID, null, null);
        createTicket(seat3, attendee, TicketStatus.USED, Instant.now(), staff);

        TodayDashboardDto result = staffDashboardService.getToday(staff);

        assertThat(result.events()).hasSize(1);
        TodayEventDto dto = result.events().get(0);
        assertThat(dto.issuedCount()).isEqualTo(3);
        assertThat(dto.validatedCount()).isEqualTo(1);
        assertThat(result.myValidationsToday()).isEqualTo(1);
    }

    @Test
    @DisplayName("getToday: myValidationsToday solo cuenta validaciones de hoy y del propio staff")
    void getToday_myValidationsTodayScopedByStaffAndDay() {
        Instant todayNoonUtc = LocalDate.now(ZoneId.of("UTC")).atTime(12, 0).atZone(ZoneId.of("UTC")).toInstant();
        Event event = createEvent("Concierto", todayNoonUtc, EventStatus.PUBLISHED);

        EventSeat s1 = createSeat(event, "A", 1);
        EventSeat s2 = createSeat(event, "A", 2);
        EventSeat s3 = createSeat(event, "A", 3);

        // Validación de OTRO staff hoy: no debe contar.
        createTicket(s1, attendee, TicketStatus.USED, Instant.now(), otherStaff);
        // Validación del propio staff de AYER: no debe contar.
        createTicket(s2, attendee, TicketStatus.USED, Instant.now().minus(Duration.ofDays(1)).minus(Duration.ofMinutes(5)), staff);
        // Validación del propio staff de hoy: cuenta.
        createTicket(s3, attendee, TicketStatus.USED, Instant.now(), staff);

        TodayDashboardDto result = staffDashboardService.getToday(staff);

        assertThat(result.myValidationsToday()).isEqualTo(1);
        // El contador del evento sí incluye las dos validaciones de hoy (mías y del otro staff),
        // pero excluye la de ayer.
        assertThat(result.events().get(0).validatedCount()).isEqualTo(2);
    }

    // --- helpers ---

    private Event createEvent(String title, Instant startsAt, EventStatus status) {
        Venue venue = venueRepository.save(Venue.builder()
                .name("Venue " + UUID.randomUUID())
                .capacity(100)
                .build());
        sectionRepository.save(Section.builder().venue(venue).name("Platea").build());
        return eventRepository.save(Event.builder()
                .venue(venue)
                .title(title)
                .startsAt(startsAt)
                .status(status)
                .build());
    }

    private EventSeat createSeat(Event event, String row, int number) {
        Section section = sectionRepository.findByVenueId(event.getVenue().getId()).get(0);
        Seat seat = seatRepository.saveAndFlush(Seat.builder()
                .section(section).rowLabel(row).seatNumber(number).build());
        return eventSeatRepository.save(EventSeat.builder()
                .event(event).seat(seat).priceCents(5000)
                .status(EventSeatStatus.SOLD).build());
    }

    private void createTicket(EventSeat seat, User user, TicketStatus status,
                              Instant usedAt, User usedByStaff) {
        ticketRepository.save(Ticket.builder()
                .eventSeat(seat)
                .user(user)
                .code(UUID.randomUUID())
                .qrSignature("test-signature")
                .status(status)
                .issuedAt(Instant.now().minus(Duration.ofHours(1)))
                .usedAt(usedAt)
                .usedByStaff(usedByStaff)
                .paymentRef("MOCK-test")
                .build());
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        ticketRepository.deleteAll();
        eventSeatRepository.deleteAll();
        eventRepository.deleteAll();
        seatRepository.deleteAll();
        sectionRepository.deleteAll();
        venueRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.deleteAll();
    }
}
