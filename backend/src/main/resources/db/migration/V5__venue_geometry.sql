-- =====================================================
-- V5: Geometría del auditorio y de las secciones
-- =====================================================
-- Soporta el mapa interactivo: el auditorio tiene un lienzo y un
-- escenario; cada sección tiene una forma (polígono) y un tipo.

-- ---------- VENUES: lienzo y escenario ----------
ALTER TABLE venues ADD COLUMN canvas_width  INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE venues ADD COLUMN canvas_height INTEGER NOT NULL DEFAULT 800;
-- Polígono del escenario, como arreglo JSON de puntos [{ "x":.., "y":.. }].
ALTER TABLE venues ADD COLUMN stage_shape   JSONB;

-- ---------- VENUE_BACKGROUNDS (imagen del plano) ----------
-- Tabla aparte para no cargar el blob en cada consulta de venues.
CREATE TABLE venue_backgrounds (
    venue_id    UUID         PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
    image       BYTEA        NOT NULL,
    mime        VARCHAR(100) NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- SECTIONS: tipo, forma y cupo ----------
-- SEATED: con asientos numerados.  GENERAL_ADMISSION: se vende cupo.
ALTER TABLE sections ADD COLUMN type     VARCHAR(20) NOT NULL DEFAULT 'SEATED'
    CHECK (type IN ('SEATED','GENERAL_ADMISSION'));
-- Polígono de la sección sobre el lienzo del auditorio.
ALTER TABLE sections ADD COLUMN shape    JSONB;
-- Cupo, solo para secciones de admisión general.
ALTER TABLE sections ADD COLUMN capacity INTEGER CHECK (capacity IS NULL OR capacity > 0);
