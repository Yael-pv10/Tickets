package com.auditorio.tickets.modules.reservation.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(ReservationCleanupJob.class);

    private final ReservationService reservationService;

    public ReservationCleanupJob(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    /** Cada minuto libera asientos cuya reserva expiró. */
    @Scheduled(fixedDelayString = "${app.reservation.cleanup-interval-ms:60000}")
    public void releaseExpired() {
        int expired = reservationService.releaseExpiredReservations();
        if (expired > 0) {
            log.info("Liberadas {} reservas vencidas", expired);
        }
    }
}
