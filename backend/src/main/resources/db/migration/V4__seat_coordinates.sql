-- =====================================================
-- V4: Coordenadas de disposición por asiento
-- =====================================================
-- Cada asiento guarda una posición (pos_x, pos_y) en un espacio
-- abstracto de diseño. La forma del auditorio emerge de dónde están
-- los asientos, así que no hace falta un "tipo de forma".

ALTER TABLE seats ADD COLUMN pos_x INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seats ADD COLUMN pos_y INTEGER NOT NULL DEFAULT 0;

-- Relleno de los asientos existentes con una cuadrícula por defecto:
-- pos_x según el número de asiento, pos_y según el orden de la fila.
-- Las filas se ordenan por longitud y luego alfabéticamente (A..Z, AA..).
WITH ranked AS (
    SELECT
        id,
        (seat_number - 1) * 100 AS px,
        (DENSE_RANK() OVER (
            PARTITION BY section_id
            ORDER BY length(row_label), row_label
        ) - 1) * 100 AS py
    FROM seats
)
UPDATE seats s
SET pos_x = r.px,
    pos_y = r.py
FROM ranked r
WHERE s.id = r.id;
