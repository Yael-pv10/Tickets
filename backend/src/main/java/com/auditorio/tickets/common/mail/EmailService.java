package com.auditorio.tickets.common.mail;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Envío de correos HTML. El método de envío es asíncrono: nunca debe
 * bloquear ni hacer fallar la operación de negocio que lo dispara
 * (p. ej. confirmar una reserva). Los errores se registran, no se propagan.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;

    public EmailService(JavaMailSender mailSender,
                         @Value("${app.mail.enabled:false}") boolean enabled,
                         @Value("${app.mail.from:no-reply@auditorio.local}") String from) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
    }

    /** Imagen embebida en el cuerpo HTML, referenciada con {@code <img src="cid:contentId">}. */
    public record InlineImage(String contentId, byte[] data, String mimeType) {}

    /**
     * Envía un correo HTML con imágenes embebidas opcionales.
     * Se ejecuta en un hilo aparte; si MAIL_ENABLED=false solo registra y omite.
     */
    @Async
    public void sendHtml(String to, String subject, String html, List<InlineImage> inlineImages) {
        if (!enabled) {
            log.info("Envío de correo deshabilitado (app.mail.enabled=false); se omite correo a {}", to);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            for (InlineImage img : inlineImages) {
                helper.addInline(img.contentId(), new ByteArrayResource(img.data()), img.mimeType());
            }
            mailSender.send(message);
            log.info("Correo enviado a {}: {}", to, subject);
        } catch (Exception e) {
            log.error("No se pudo enviar el correo a {}: {}", to, e.getMessage());
        }
    }
}
