# Seguridad

## Autenticación

- **JWT RS256** con par de claves asimétricas. La clave privada solo vive en el backend; el frontend nunca la conoce.
- **Access token**: 15 min de vida, enviado en header `Authorization: Bearer ...`.
- **Refresh token**: 7 días, almacenado en cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Rotación en cada uso, el anterior queda revocado.
- **OAuth2 Google**: Spring Security valida el `id_token` contra el JWKS público de Google.
- **BCrypt cost 12** para contraseñas. Política: 8+ caracteres con mayúscula, número y símbolo.
- **Bloqueo de cuenta** tras 5 intentos fallidos en 15 minutos (`failed_login_attempts` + `locked_until` en tabla `users`).

## Autorización

- RBAC con `ADMIN`, `CLIENT`, `STAFF`.
- `@PreAuthorize("hasRole('ADMIN')")` en endpoints sensibles.
- Verificación de propiedad: un cliente solo accede a sus propios tickets (`ticket.userId == currentUser.id`).

## Protección del QR

- El QR contiene un token UUID v4 + firma HMAC-SHA256 del payload (`ticketId|eventId|seatCode|exp`).
- La firma usa `QR_SIGNING_SECRET` (mínimo 256 bits, rotable).
- Validación de **un solo uso** mediante UPDATE atómico:
  ```sql
  UPDATE tickets
     SET status = 'USED', used_at = NOW(), used_by_staff_id = ?
   WHERE id = ? AND status = 'PAID';
  ```
  Si afecta 0 filas → ya usado, cancelado o inexistente.
- Cada validación se registra en `audit_log` con IP, user-agent y staff responsable.

## Concurrencia en compra de asientos

- **Lock pesimista** o **versión optimista** (`@Version` en `event_seats`) para evitar dobles ventas.
- Reserva con TTL de 10 minutos. Job programado libera reservas expiradas.

## Protección de la API

| Riesgo | Mitigación |
|--------|-----------|
| HTTP en claro | HSTS + redirección 301 a HTTPS |
| CORS abierto | `CORS_ALLOWED_ORIGINS` con whitelist explícita |
| CSRF en POST | Stateless con JWT en header; CSRF habilitado solo en flujo OAuth |
| Rate abuso | Bucket4j: 100 req/min público, 10 req/min en `/auth/login` |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Fugas vía referer | `Referrer-Policy: no-referrer` |
| Inyección JS | CSP estricto, escape automático de React, sanitización con Jsoup en backend |
| SQL injection | JPA con parámetros, sin concatenación de strings |

## Validación de entrada

- **Bean Validation (Jakarta)** en backend: `@Email`, `@NotBlank`, `@Pattern("^[A-Z]+[0-9]+$")` para seatCode.
- **Zod** en frontend antes de cualquier llamada al backend.
- **Jsoup** sanitiza campos de texto libre (descripciones de eventos) para prevenir XSS persistente.

## Logs y auditoría

- Tabla `audit_log` registra: login (éxito/fallo), creación/edición/borrado de eventos y venues, validación de tickets, cancelaciones.
- Logs estructurados JSON con SLF4J + Logback.
- **No se loguean** contraseñas, tokens JWT, ni códigos QR completos.

## Gestión de secretos

- `.env` y carpeta `keys/` están en `.gitignore`. Nunca se commitean.
- En producción: variables de entorno gestionadas por orquestador (Docker secrets, AWS Secrets Manager, Vault).
- Rotación periódica de `QR_SIGNING_SECRET` y claves JWT.

## Dependencias

- **OWASP Dependency-Check** integrado en Maven (`mvn dependency-check:check`), falla el build con CVSS ≥ 7.
- `npm audit` en frontend en cada CI.
- Actualizaciones de seguridad mensuales.

## Pagos

- **No se almacenan datos de tarjeta**. Toda la información sensible queda en el proveedor (Stripe/MercadoPago).
- Solo se persiste `payment_ref` (ID de la transacción) en la tabla `tickets`.
- Webhooks verificados con firma del proveedor.
