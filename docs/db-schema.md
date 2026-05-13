# Esquema de Base de Datos

Toda la creación se hace mediante migraciones Flyway en `backend/src/main/resources/db/migration/`.

## Diagrama

```
users ─┬─< tickets >─ event_seats >─ events >─ venues
       │                              │           │
       └─< refresh_tokens             └─< seats <─┴─< sections
       │
       └─< audit_log
```

## Tablas

### `users`
Usuarios del sistema con tres roles posibles. Soporta auth por contraseña (BCrypt) y/o Google OAuth.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | generado |
| email | VARCHAR(320) UNIQUE NOT NULL | |
| password_hash | VARCHAR(100) | NULL si solo usa Google |
| name | VARCHAR(120) NOT NULL | |
| role | VARCHAR(20) CHECK | ADMIN / CLIENT / STAFF |
| google_id | VARCHAR(100) UNIQUE | NULL si no usa Google |
| failed_login_attempts | INT NOT NULL DEFAULT 0 | |
| locked_until | TIMESTAMPTZ | bloqueo temporal tras 5 fallos |
| enabled | BOOL NOT NULL DEFAULT TRUE | |
| created_at, updated_at | TIMESTAMPTZ | auditoría |

### `venues` → `sections` → `seats`
Catálogo estable del auditorio. Un venue tiene varias secciones (Platea, Palco, Galería…) y cada sección sus asientos.

**`seats.seat_code`** es una columna **generada** por PostgreSQL: `row_label || seat_number`.
Ejemplos: `A1`, `B12`, `AA3`. Restricción `row_label ~ '^[A-Z]+$'` y `seat_number > 0`.

### `events`
Cada evento se realiza en un venue. Estados: `DRAFT`, `PUBLISHED`, `CANCELLED`, `FINISHED`.

### `event_seats`
Estado del asiento **por evento**. Permite reutilizar el catálogo de `seats` en múltiples eventos.

| Estado | Significado |
|--------|------------|
| AVAILABLE | Disponible para comprar |
| LOCKED | Reservado temporalmente (`locked_until`) |
| SOLD | Vendido, hay ticket asociado |
| BLOCKED | Inhabilitado por admin (visibilidad, accesibilidad, etc.) |

Incluye `version BIGINT` para optimistic locking (`@Version`).

### `tickets`
Un ticket por `event_seat`. Estados: `RESERVED`, `PAID`, `USED`, `CANCELLED`, `REFUNDED`.
- `code UUID UNIQUE`: identificador público del ticket (lo que se codifica en el QR).
- `qr_signature`: firma HMAC del payload.
- `used_at` + `used_by_staff_id`: trazabilidad de la entrada.

### `refresh_tokens`
Rotación de refresh tokens. Cada uso genera uno nuevo y marca el anterior como `revoked` con `replaced_by_id`.

### `audit_log`
Registro append-only de acciones sensibles. JSONB en `metadata` permite extender sin migraciones.

## Convenciones

- PK siempre UUID v4 generado por `gen_random_uuid()` (extensión `pgcrypto`).
- Timestamps siempre `TIMESTAMPTZ` en UTC.
- Borrado en cascada solo donde tiene sentido (venue → sections → seats). Tickets nunca se borran físicamente.
- Constraints `CHECK` para enums en lugar de tipos `ENUM` de PostgreSQL (más flexibles para agregar valores).
