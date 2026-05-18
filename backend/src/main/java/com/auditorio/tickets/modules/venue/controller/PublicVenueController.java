package com.auditorio.tickets.modules.venue.controller;

import com.auditorio.tickets.modules.venue.dto.VenueDto;
import com.auditorio.tickets.modules.venue.model.VenueBackground;
import com.auditorio.tickets.modules.venue.service.VenueService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/api/venues")
@Tag(name = "Venues", description = "Datos públicos de auditorios")
public class PublicVenueController {

    private final VenueService venueService;

    public PublicVenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    /** Geometría del auditorio (lienzo, escenario y secciones) para el mapa. */
    @GetMapping("/{id}")
    public VenueDto get(@PathVariable UUID id) {
        return venueService.get(id);
    }

    /** Sirve la imagen del plano del auditorio para el mapa interactivo. */
    @GetMapping("/{id}/background")
    public ResponseEntity<byte[]> background(@PathVariable UUID id) {
        VenueBackground bg = venueService.getBackground(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(bg.getMime()))
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .body(bg.getImage());
    }
}
