package com.auditorio.tickets.modules.auth.service;

import com.auditorio.tickets.common.audit.AuditService;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.modules.auth.dto.AuthResponse;
import com.auditorio.tickets.modules.auth.dto.LoginRequest;
import com.auditorio.tickets.modules.auth.dto.RegisterRequest;
import com.auditorio.tickets.modules.auth.model.RefreshToken;
import com.auditorio.tickets.modules.auth.repository.RefreshTokenRepository;
import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import com.auditorio.tickets.security.jwt.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       LoginAttemptService loginAttemptService,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResult register(RegisterRequest request, String ip, String userAgent) {
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BusinessException("El email ya está registrado");
        }
        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name().trim())
                .role(Role.CLIENT)
                .enabled(true)
                .build();
        userRepository.save(user);
        auditService.log(user.getId(), "USER_REGISTERED", "users", user.getId().toString(),
                ip, userAgent, null);
        return issueTokens(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request, String ip, String userAgent) {
        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        if (loginAttemptService.isLocked(user)) {
            throw new LockedException("Cuenta bloqueada temporalmente por demasiados intentos fallidos");
        }
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptService.recordFailure(user);
            auditService.log(user.getId(), "LOGIN_FAILED", "users", user.getId().toString(),
                    ip, userAgent, null);
            throw new BadCredentialsException("Credenciales inválidas");
        }
        if (!user.isEnabled()) {
            throw new BadCredentialsException("Cuenta deshabilitada");
        }

        loginAttemptService.recordSuccess(user);
        auditService.log(user.getId(), "LOGIN_SUCCESS", "users", user.getId().toString(),
                ip, userAgent, null);
        return issueTokens(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BadCredentialsException("Refresh token ausente");
        }
        String hash = sha256(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadCredentialsException("Refresh token inválido"));

        if (!stored.isActive()) {
            // Reuse de un token revocado o expirado: revoca toda la familia del usuario
            // para mitigar token theft.
            refreshTokenRepository.revokeAllForUser(stored.getUser());
            throw new BadCredentialsException("Refresh token inválido");
        }

        User user = stored.getUser();
        AuthResult result = issueTokens(user);
        // Marca el anterior como revocado y enlazado al nuevo.
        stored.setRevoked(true);
        // Buscamos el RefreshToken recién creado por su hash para enlazarlo
        refreshTokenRepository.findByTokenHash(sha256(result.rawRefreshToken()))
                .ifPresent(stored::setReplacedBy);
        refreshTokenRepository.save(stored);
        auditService.log(user.getId(), "TOKEN_REFRESHED", "refresh_tokens",
                stored.getId().toString(), ip, userAgent, null);
        return result;
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        String hash = sha256(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    /** Emite tokens tras un login exitoso por OAuth (Google). El usuario ya existe en BD. */
    @Transactional
    public AuthResult issueTokensForOAuth(User user) {
        auditService.log(user.getId(), "LOGIN_SUCCESS_OAUTH", "users",
                user.getId().toString(), null, null, null);
        return issueTokens(user);
    }

    public AuthResponse toResponse(AuthResult result) {
        User u = result.user();
        return new AuthResponse(
                result.accessToken(),
                result.expiresInSeconds(),
                new AuthResponse.UserSummary(u.getId(), u.getEmail(), u.getName(), u.getRole().name())
        );
    }

    // ------- helpers -------

    private AuthResult issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefresh = generateRawToken();
        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .tokenHash(sha256(rawRefresh))
                .expiresAt(Instant.now().plus(jwtService.getRefreshExpirationDays(), ChronoUnit.DAYS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rt);
        return new AuthResult(
                accessToken,
                jwtService.getAccessExpirationMin() * 60L,
                rawRefresh,
                user
        );
    }

    private String generateRawToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    public record AuthResult(String accessToken, long expiresInSeconds, String rawRefreshToken, User user) {}
}
