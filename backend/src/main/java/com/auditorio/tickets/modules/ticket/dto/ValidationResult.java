package com.auditorio.tickets.modules.ticket.dto;

public record ValidationResult(
        Status status,
        String message,
        String attendeeName,
        String seatCode,
        String sectionName,
        String eventTitle
) {
    public enum Status { OK, ALREADY_USED, INVALID, EXPIRED }

    public static ValidationResult ok(String attendeeName, String seatCode, String sectionName, String eventTitle) {
        return new ValidationResult(Status.OK, "Acceso permitido", attendeeName, seatCode, sectionName, eventTitle);
    }

    public static ValidationResult alreadyUsed(String seatCode, String eventTitle) {
        return new ValidationResult(Status.ALREADY_USED, "Este ticket ya fue usado", null, seatCode, null, eventTitle);
    }

    public static ValidationResult invalid() {
        return new ValidationResult(Status.INVALID, "Ticket inválido o falsificado", null, null, null, null);
    }
}
