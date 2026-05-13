-- =====================================================
-- V1: Esquema inicial
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- USERS ----------
CREATE TABLE users (
    id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email                    VARCHAR(320)    NOT NULL,
    password_hash            VARCHAR(100),
    name                     VARCHAR(120)    NOT NULL,
    role                     VARCHAR(20)     NOT NULL CHECK (role IN ('ADMIN','CLIENT','STAFF')),
    google_id                VARCHAR(100),
    failed_login_attempts    INTEGER         NOT NULL DEFAULT 0,
    locked_until             TIMESTAMPTZ,
    enabled                  BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_users_email      UNIQUE (email),
    CONSTRAINT uk_users_google_id  UNIQUE (google_id)
);

CREATE INDEX idx_users_role ON users(role);

-- ---------- VENUES (auditorios) ----------
CREATE TABLE venues (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL,
    address      VARCHAR(300),
    capacity     INTEGER      NOT NULL CHECK (capacity > 0),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- SECTIONS (zonas dentro del auditorio) ----------
CREATE TABLE sections (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id     UUID         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name         VARCHAR(80)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_sections_venue_name UNIQUE (venue_id, name)
);

-- ---------- SEATS (asientos alfanuméricos: A1, B12, ...) ----------
CREATE TABLE seats (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id     UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    row_label      VARCHAR(5)   NOT NULL CHECK (row_label ~ '^[A-Z]+$'),
    seat_number    INTEGER      NOT NULL CHECK (seat_number > 0),
    seat_code      VARCHAR(10)  GENERATED ALWAYS AS (row_label || seat_number::text) STORED,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_seats_section_code UNIQUE (section_id, seat_code)
);

CREATE INDEX idx_seats_section ON seats(section_id);

-- ---------- EVENTS ----------
CREATE TABLE events (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id        UUID         NOT NULL REFERENCES venues(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    starts_at       TIMESTAMPTZ  NOT NULL,
    ends_at         TIMESTAMPTZ,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','PUBLISHED','CANCELLED','FINISHED')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_venue   ON events(venue_id);
CREATE INDEX idx_events_starts  ON events(starts_at);
CREATE INDEX idx_events_status  ON events(status);

-- ---------- EVENT_SEATS (estado/precio por asiento en cada evento) ----------
CREATE TABLE event_seats (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_id          UUID            NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    price_cents      INTEGER         NOT NULL CHECK (price_cents >= 0),
    status           VARCHAR(20)     NOT NULL DEFAULT 'AVAILABLE'
                     CHECK (status IN ('AVAILABLE','LOCKED','SOLD','BLOCKED')),
    locked_until     TIMESTAMPTZ,
    locked_by_user_id UUID           REFERENCES users(id),
    version          BIGINT          NOT NULL DEFAULT 0,  -- @Version optimista
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_event_seat UNIQUE (event_id, seat_id)
);

CREATE INDEX idx_event_seats_event  ON event_seats(event_id);
CREATE INDEX idx_event_seats_status ON event_seats(status);

-- ---------- TICKETS ----------
CREATE TABLE tickets (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_seat_id      UUID            NOT NULL REFERENCES event_seats(id) ON DELETE RESTRICT,
    user_id            UUID            NOT NULL REFERENCES users(id),
    code               UUID            NOT NULL DEFAULT gen_random_uuid(),  -- token público del QR
    qr_signature       VARCHAR(512)    NOT NULL,                            -- firma HMAC del payload
    status             VARCHAR(20)     NOT NULL DEFAULT 'PAID'
                       CHECK (status IN ('RESERVED','PAID','USED','CANCELLED','REFUNDED')),
    issued_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    used_at            TIMESTAMPTZ,
    used_by_staff_id   UUID            REFERENCES users(id),
    payment_ref        VARCHAR(200),
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tickets_code        UNIQUE (code),
    CONSTRAINT uk_tickets_event_seat  UNIQUE (event_seat_id)
);

CREATE INDEX idx_tickets_user   ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);

-- ---------- AUDIT LOG ----------
CREATE TABLE audit_log (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         REFERENCES users(id),
    action      VARCHAR(80)  NOT NULL,
    entity      VARCHAR(80),
    entity_id   VARCHAR(80),
    ip          VARCHAR(45),
    user_agent  VARCHAR(300),
    metadata    JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user    ON audit_log(user_id);
CREATE INDEX idx_audit_action  ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ---------- REFRESH TOKENS (rotación) ----------
CREATE TABLE refresh_tokens (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash     VARCHAR(128) NOT NULL,
    expires_at     TIMESTAMPTZ  NOT NULL,
    revoked        BOOLEAN      NOT NULL DEFAULT FALSE,
    replaced_by_id UUID         REFERENCES refresh_tokens(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
