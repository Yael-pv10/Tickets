package com.auditorio.tickets.modules.venue.controller;

import com.auditorio.tickets.modules.venue.dto.*;
import com.auditorio.tickets.modules.venue.service.VenueService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/venues")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Venues", description = "Gestión de auditorios, secciones y asientos")
public class VenueController {

    private final VenueService venueService;

    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @GetMapping
    public List<VenueDto> list() {
        return venueService.listAll();
    }

    @GetMapping("/{id}")
    public VenueDto get(@PathVariable UUID id) {
        return venueService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VenueDto create(@Valid @RequestBody CreateVenueRequest request) {
        return venueService.create(request);
    }

    @PutMapping("/{id}")
    public VenueDto update(@PathVariable UUID id, @Valid @RequestBody CreateVenueRequest request) {
        return venueService.update(id, request);
    }

    @PutMapping("/{id}/canvas")
    public VenueDto updateCanvas(@PathVariable UUID id,
                                 @Valid @RequestBody UpdateVenueCanvasRequest request) {
        return venueService.updateVenueCanvas(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        venueService.delete(id);
    }

    // ---------- imagen de fondo (plano) ----------

    @PutMapping("/{id}/background")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uploadBackground(@PathVariable UUID id,
                                 @RequestParam("file") MultipartFile file) {
        venueService.setBackground(id, file);
    }

    @DeleteMapping("/{id}/background")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBackground(@PathVariable UUID id) {
        venueService.deleteBackground(id);
    }

    // ---------- sections ----------

    @PostMapping("/{venueId}/sections")
    @ResponseStatus(HttpStatus.CREATED)
    public SectionDto createSection(@PathVariable UUID venueId,
                                    @Valid @RequestBody CreateSectionRequest request) {
        return venueService.createSection(venueId, request);
    }

    @PutMapping("/sections/{sectionId}/shape")
    public SectionDto updateSectionShape(@PathVariable UUID sectionId,
                                         @Valid @RequestBody UpdateSectionShapeRequest request) {
        return venueService.updateSectionShape(sectionId, request);
    }

    @DeleteMapping("/sections/{sectionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSection(@PathVariable UUID sectionId) {
        venueService.deleteSection(sectionId);
    }

    @GetMapping("/sections/{sectionId}/seats")
    public List<SeatDto> listSeats(@PathVariable UUID sectionId) {
        return venueService.listSeatsOfSection(sectionId);
    }

    @PostMapping("/sections/{sectionId}/seats/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public List<SeatDto> bulkSeats(@PathVariable UUID sectionId,
                                   @Valid @RequestBody BulkSeatRequest request) {
        return venueService.bulkCreateSeats(sectionId, request);
    }

    @PutMapping("/sections/{sectionId}/layout")
    public List<SeatDto> updateLayout(@PathVariable UUID sectionId,
                                      @Valid @RequestBody UpdateSeatLayoutRequest request) {
        return venueService.updateSectionLayout(sectionId, request);
    }

    @PostMapping("/sections/{sectionId}/seats/fill")
    public List<SeatDto> fillSection(@PathVariable UUID sectionId,
                                     @Valid @RequestBody FillSectionRequest request) {
        return venueService.fillSection(sectionId, request);
    }
}
