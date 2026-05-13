-- =====================================================
-- V3: Reservas temporales de asientos
-- =====================================================

CREATE TABLE reservations (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id),
    event_id      UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','CONFIRMED','EXPIRED','CANCELLED')),
    expires_at    TIMESTAMPTZ  NOT NULL,
    confirmed_at  TIMESTAMPTZ,
    total_cents   INTEGER      NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_user             ON reservations(user_id);
CREATE INDEX idx_reservations_event            ON reservations(event_id);
CREATE INDEX idx_reservations_status_expires   ON reservations(status, expires_at);

-- Enlace event_seats → reservation
ALTER TABLE event_seats
    ADD COLUMN reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;

CREATE INDEX idx_event_seats_reservation ON event_seats(reservation_id);
