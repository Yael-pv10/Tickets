package com.auditorio.tickets.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String privateKeyPath,
        String publicKeyPath,
        int accessExpirationMin,
        int refreshExpirationDays,
        String issuer) {}
