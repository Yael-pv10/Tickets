package com.auditorio.tickets.modules.event.service;

import com.auditorio.tickets.AbstractIntegrationTest;
import com.auditorio.tickets.common.audit.AuditLogRepository;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.modules.event.dto.CreateEventRequest;
import com.auditorio.tickets.modules.event.dto.EventDto;
import com.auditorio.tickets.modules.event.dto.EventSeatDto;
import com.auditorio.tickets.modules.event.dto.SectionPrice;
import com.auditorio.tickets.modules.event.repository.EventRepository;
import com.auditorio.tickets.modules.event.repository.EventSeatRepository;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for CU-A18: precios por sección al crear un evento.
 *
 * Verifica el contrato de {@code EventService.create} respecto a {@code sectionPrices}:
 *   1. Sin overrides, todas las secciones reciben {@code defaultPriceCents}.
 *   2. Con overrides parciales, las secciones listadas usan su precio y el resto el default.
 *   3. Una sección que no pertenece al venue es rechazada con BusinessException.
 *   4. Precios duplicados en la lista son rechazados.
 */
class EventCreationPricingIntegrationTest extends AbstractIntegrationTest {

    @Autowired EventService eventService;
    @Autowired EventRepository eventRepository;
    @Autowired EventSeatRepository eventSeatRepository;
    @Autowired VenueRepository venueRepository;
    @Autowired SectionRepository sectionRepository;
    @Autowired SeatRepository seatRepository;
    @Autowired AuditLogRepository auditLogRepository;

    private Venue venue;
    private Section plateaSection;
    private Section palcoSection;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        venue = venueRepository.save(Venue.builder()
                .name("Sala Principal")
                .address("Av. Test 123")
                .capacity(100)
                .build());

        plateaSection = sectionRepository.save(Section.builder()
                .venue(venue).name("Platea").build());
        palcoSection = sectionRepository.save(Section.builder()
                .venue(venue).name("Palco").build());

        // 3 asientos en Platea, 2 en Palco
        seatRepository.saveAndFlush(Seat.builder().section(plateaSection).rowLabel("A").seatNumber(1).build());
        seatRepository.saveAndFlush(Seat.builder().section(plateaSection).rowLabel("A").seatNumber(2).build());
        seatRepository.saveAndFlush(Seat.builder().section(plateaSection).rowLabel("A").seatNumber(3).build());
        seatRepository.saveAndFlush(Seat.builder().section(palcoSection).rowLabel("B").seatNumber(1).build());
        seatRepository.saveAndFlush(Seat.builder().section(palcoSection).rowLabel("B").seatNumber(2).build());
    }

    @Test
    @DisplayName("Sin overrides: todas las secciones usan defaultPriceCents")
    void create_withoutSectionPrices_appliesDefaultToAllSeats() {
        EventDto created = eventService.create(buildRequest(50000, null));

        // listSeats() es @Transactional(readOnly): los accesos lazy a seat/section funcionan dentro de su sesión.
        List<EventSeatDto> seats = eventService.listSeats(created.id());

        assertThat(seats).hasSize(5);
        assertThat(seats).allSatisfy(s -> assertThat(s.priceCents()).isEqualTo(50000));
    }

    @Test
    @DisplayName("Con override parcial: la sección listada usa su precio, el resto el default")
    void create_withSectionPriceOverride_appliesPerSectionPrice() {
        EventDto created = eventService.create(buildRequest(
                50000,
                List.of(new SectionPrice(palcoSection.getId(), 120000))));

        Map<String, List<EventSeatDto>> bySection = eventService.listSeats(created.id()).stream()
                .collect(Collectors.groupingBy(EventSeatDto::sectionName));

        assertThat(bySection.get("Platea")).hasSize(3)
                .allSatisfy(s -> assertThat(s.priceCents()).isEqualTo(50000));
        assertThat(bySection.get("Palco")).hasSize(2)
                .allSatisfy(s -> assertThat(s.priceCents()).isEqualTo(120000));
    }

    @Test
    @DisplayName("Con overrides para todas las secciones: el default es ignorado donde haya override")
    void create_withFullOverrides_appliesAllPerSection() {
        EventDto created = eventService.create(buildRequest(
                99999,
                List.of(
                        new SectionPrice(plateaSection.getId(), 30000),
                        new SectionPrice(palcoSection.getId(), 80000))));

        Map<String, List<EventSeatDto>> bySection = eventService.listSeats(created.id()).stream()
                .collect(Collectors.groupingBy(EventSeatDto::sectionName));

        assertThat(bySection.get("Platea")).allSatisfy(s -> assertThat(s.priceCents()).isEqualTo(30000));
        assertThat(bySection.get("Palco")).allSatisfy(s -> assertThat(s.priceCents()).isEqualTo(80000));
    }

    @Test
    @DisplayName("Sección que no pertenece al venue: rechaza con BusinessException")
    void create_withForeignSectionId_rejected() {
        UUID foreignSectionId = UUID.randomUUID();

        assertThatThrownBy(() -> eventService.create(buildRequest(
                50000,
                List.of(new SectionPrice(foreignSectionId, 70000)))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no pertenece al venue");

        // No se persistió ningún evento.
        assertThat(eventRepository.count()).isZero();
    }

    @Test
    @DisplayName("Precio duplicado para la misma sección: rechaza con BusinessException")
    void create_withDuplicateSectionPrice_rejected() {
        assertThatThrownBy(() -> eventService.create(buildRequest(
                50000,
                List.of(
                        new SectionPrice(plateaSection.getId(), 30000),
                        new SectionPrice(plateaSection.getId(), 40000)))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("duplicado");

        assertThat(eventRepository.count()).isZero();
    }

    private CreateEventRequest buildRequest(int defaultPriceCents, List<SectionPrice> sectionPrices) {
        return new CreateEventRequest(
                venue.getId(),
                "Concierto de prueba",
                "Descripción de prueba",
                Instant.now().plus(7, ChronoUnit.DAYS),
                null,
                defaultPriceCents,
                sectionPrices);
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        eventSeatRepository.deleteAll();
        eventRepository.deleteAll();
        seatRepository.deleteAll();
        sectionRepository.deleteAll();
        venueRepository.deleteAll();
        auditLogRepository.deleteAll();
    }
}
