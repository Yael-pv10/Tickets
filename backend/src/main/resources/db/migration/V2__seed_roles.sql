-- =====================================================
-- V2: Datos semilla
-- =====================================================
-- El usuario administrador inicial NO se crea en SQL.
-- Se crea en arranque de la aplicación mediante AdminBootstrap
-- usando las variables:
--   app.bootstrap.admin-email
--   app.bootstrap.admin-password
-- Esto evita commits de hashes BCrypt y facilita rotar la contraseña.

-- Este archivo se mantiene para reservar el número de versión V2 en Flyway.
SELECT 1;
