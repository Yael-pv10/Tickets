# Arquitectura

## Visión general

Aplicación cliente-servidor con backend REST en Spring Boot y frontend Next.js. Comunicación vía JSON sobre HTTPS. Autenticación con JWT (RS256) y OAuth2 Google. Datos persistidos en PostgreSQL.

```
┌─────────────────┐      HTTPS/REST       ┌─────────────────┐      JDBC      ┌──────────────┐
│  Frontend (Next)│ ────────────────────► │ Backend (Spring)│ ──────────────►│ PostgreSQL   │
│ - Cliente web   │  Bearer JWT           │ - REST API      │                │ - Flyway     │
│ - Admin panel   │                       │ - Spring Sec.   │                │              │
│ - PWA scanner   │                       │ - JPA/Hibernate │                │              │
└─────────────────┘                       └─────────────────┘                └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ SMTP (email) │
                                          │ Google OAuth │
                                          └──────────────┘
```

## Módulos del backend

| Módulo | Responsabilidad |
|--------|----------------|
| `auth` | Registro, login, refresh, OAuth Google |
| `user` | Gestión de usuarios y roles |
| `venue` | Auditorios, secciones y catálogo de asientos |
| `event` | Eventos sobre venues, estados y publicación |
| `ticket` | Generación de QR firmados, descarga, validación |
| `reservation` | Bloqueo temporal de asientos durante compra |
| `infrastructure` | Servicios técnicos (email, almacenamiento) |
| `common` | Auditoría JPA, excepciones, utilidades |

## Áreas del frontend

| Área | Rutas | Acceso |
|------|-------|--------|
| Público | `/`, `/events`, `/login` | Sin autenticación |
| Cliente | `/my-tickets`, `/checkout` | Rol CLIENT |
| Admin | `/dashboard`, `/dashboard/events`, `/dashboard/venues` | Rol ADMIN |
| Staff (PWA) | `/scan` | Rol STAFF o ADMIN |

## Flujo de compra y validación

1. Cliente entra al evento, selecciona asiento en `SeatMap`.
2. Frontend llama `POST /api/reservations` → backend bloquea asiento con `SELECT ... FOR UPDATE` por 10 min.
3. Cliente paga (Stripe/MercadoPago). Webhook confirma pago.
4. Backend crea registro en `tickets`, genera QR firmado HMAC, envía email.
5. Día del evento: staff abre PWA `/scan`, escanea QR con cámara.
6. `POST /api/staff/validate` con el token → `UPDATE tickets SET status='USED' WHERE status='PAID'` atómico.
7. Si filas afectadas = 0, el ticket está usado o es inválido.

## Decisiones de diseño

- **JPA + Flyway** en lugar de `ddl-auto=update` para tener un historial de cambios versionado.
- **Asientos como `seat_code` calculada**: `row_label || seat_number` se genera en PostgreSQL para garantizar consistencia.
- **`event_seats` separado de `seats`**: el catálogo del venue es estable; el estado depende del evento.
- **Optimistic locking (`@Version`)** en `event_seats` para evitar dobles ventas sin necesidad de Redis.
- **Refresh token rotation** con tabla `refresh_tokens`: cada uso invalida el anterior.
