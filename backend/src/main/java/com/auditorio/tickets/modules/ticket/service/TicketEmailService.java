package com.auditorio.tickets.modules.ticket.service;

import com.auditorio.tickets.common.mail.EmailService;
import com.auditorio.tickets.common.mail.EmailService.InlineImage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Compone y dispara el correo de confirmación con los boletos y sus QR.
 * Recibe datos planos (no entidades JPA) para poder ejecutarse fuera de
 * una sesión de Hibernate sin disparar carga perezosa.
 */
@Service
public class TicketEmailService {

    private static final Logger log = LoggerFactory.getLogger(TicketEmailService.class);
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("EEEE d 'de' MMMM 'de' yyyy · HH:mm 'h'", Locale.of("es"));

    private final EmailService emailService;
    private final QrCodeService qrCodeService;
    private final String frontendBaseUrl;

    public TicketEmailService(EmailService emailService,
                              QrCodeService qrCodeService,
                              @Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.emailService = emailService;
        this.qrCodeService = qrCodeService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    /** Datos de un boleto necesarios para el correo. {@code qrPayload} = code.signature. */
    public record TicketLine(String seatCode, String sectionName, String qrPayload) {}

    /**
     * Genera los QR, arma el HTML y delega el envío en EmailService (asíncrono).
     * Cualquier fallo se registra: enviar el correo nunca debe romper la compra.
     */
    public void sendConfirmation(String toEmail, String toName,
                                 String eventTitle, String venueName,
                                 Instant eventStartsAt, List<TicketLine> tickets) {
        if (tickets.isEmpty()) {
            return;
        }
        try {
            List<InlineImage> images = new ArrayList<>(tickets.size());
            for (int i = 0; i < tickets.size(); i++) {
                byte[] png = qrCodeService.generatePng(tickets.get(i).qrPayload(), 240);
                images.add(new InlineImage("qr-" + i, png, "image/png"));
            }
            String html = buildHtml(toName, eventTitle, venueName, eventStartsAt, tickets);
            emailService.sendHtml(toEmail, "Tus boletos · " + eventTitle, html, images);
        } catch (Exception e) {
            log.error("No se pudo preparar el correo de boletos para {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildHtml(String toName, String eventTitle, String venueName,
                             Instant eventStartsAt, List<TicketLine> tickets) {
        String when = eventStartsAt.atZone(ZoneId.systemDefault()).format(DATE_FMT);

        StringBuilder cards = new StringBuilder();
        for (int i = 0; i < tickets.size(); i++) {
            TicketLine t = tickets.get(i);
            cards.append("""
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                       style="border:1px solid #2a2722;background:#16140f;margin:14px 0;">
                  <tr>
                    <td style="padding:18px 20px;vertical-align:middle;">
                      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;
                                  text-transform:uppercase;color:#8c8676;">Butaca</div>
                      <div style="font-family:Georgia,serif;font-size:34px;font-weight:bold;
                                  color:#c9a24b;line-height:1;">$SEAT$</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;color:#cfc9ba;
                                  margin-top:6px;">Sección $SECTION$</div>
                    </td>
                    <td width="130" style="padding:14px 20px;text-align:right;">
                      <img src="cid:qr-$IDX$" width="110" height="110" alt="Código QR"
                           style="background:#ffffff;padding:6px;border-radius:4px;" />
                    </td>
                  </tr>
                </table>
                """
                    .replace("$SEAT$", esc(t.seatCode()))
                    .replace("$SECTION$", esc(t.sectionName()))
                    .replace("$IDX$", String.valueOf(i)));
        }

        return """
            <!DOCTYPE html>
            <html lang="es">
            <body style="margin:0;padding:0;background:#0e0d0b;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#0e0d0b;padding:32px 0;">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" role="presentation"
                         style="background:#100f0c;border:1px solid #2a2722;">
                    <tr><td style="padding:28px 28px 8px;">
                      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;
                                  text-transform:uppercase;color:#c9a24b;">Auditorio · Confirmación</div>
                      <h1 style="font-family:Georgia,serif;font-size:26px;color:#f3efe3;
                                 margin:14px 0 4px;">$EVENT$</h1>
                      <div style="font-family:Arial,sans-serif;font-size:13px;color:#cfc9ba;">
                        $VENUE$<br/>$WHEN$</div>
                    </td></tr>
                    <tr><td style="padding:8px 28px;">
                      <p style="font-family:Arial,sans-serif;font-size:14px;color:#cfc9ba;">
                        Hola $NAME$, tu compra fue confirmada. Presenta el código QR de
                        cada boleto en la entrada del recinto.</p>
                      $CARDS$
                    </td></tr>
                    <tr><td style="padding:8px 28px 28px;">
                      <a href="$URL$/my-tickets"
                         style="font-family:Arial,sans-serif;font-size:13px;color:#0e0d0b;
                                background:#c9a24b;text-decoration:none;padding:11px 22px;
                                display:inline-block;font-weight:bold;">Ver mis boletos</a>
                      <p style="font-family:Arial,sans-serif;font-size:11px;color:#8c8676;
                                margin-top:20px;">Este correo es un comprobante automático.
                        No respondas a este mensaje.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """
                .replace("$EVENT$", esc(eventTitle))
                .replace("$VENUE$", esc(venueName))
                .replace("$WHEN$", esc(when))
                .replace("$NAME$", esc(toName))
                .replace("$CARDS$", cards.toString())
                .replace("$URL$", frontendBaseUrl);
    }

    /** Escapa texto para que no rompa ni inyecte HTML en el correo. */
    private static String esc(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
