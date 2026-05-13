# Auditorio Tickets

Sistema de control de asistentes para auditorios. Permite gestionar venues, eventos, vender/asignar tickets con asientos alfanuméricos (A1, B12...), generar códigos QR firmados y validarlos en la entrada mediante una PWA móvil para el staff.

## Stack

- **Backend:** Java 21 + Spring Boot 3.3 + PostgreSQL 16 + Flyway
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Auth:** Spring Security + JWT (RS256) + OAuth2 Google
- **QR:** ZXing (backend) + html5-qrcode (frontend PWA)

## Estructura

```
.
├── backend/          # API REST Spring Boot
├── frontend/         # App Next.js (cliente, admin y PWA staff)
├── docs/             # Documentación de arquitectura y seguridad
├── docker-compose.yml
└── .env.example
```

## Requisitos

- JDK 21
- Node.js 20+
- Docker + Docker Compose
- Maven 3.9+ (o usar el wrapper `./mvnw`)

## Puesta en marcha (desarrollo)

1. Copia el archivo de variables y rellénalo:
   ```bash
   cp .env.example .env
   ```

2. Levanta la base de datos:
   ```bash
   docker compose up -d db
   ```

3. Backend:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   API disponible en `http://localhost:8080` y Swagger UI en `http://localhost:8080/swagger-ui.html`.

4. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   App disponible en `http://localhost:3000`.

## Roles

- `ADMIN`: gestiona venues, eventos, asientos y reportes.
- `CLIENT`: compra/reserva tickets y descarga su QR.
- `STAFF`: valida QR en la entrada del evento mediante la PWA.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Seguridad](docs/security.md)
- [Esquema de base de datos](docs/db-schema.md)
