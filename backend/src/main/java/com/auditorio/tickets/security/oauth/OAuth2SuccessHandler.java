package com.auditorio.tickets.security.oauth;

import com.auditorio.tickets.modules.auth.service.AuthService;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;
    private final UserRepository userRepository;

    @Value("${app.cors.allowed-origins}")
    private String frontendOrigin;

    public OAuth2SuccessHandler(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        UUID userId = UUID.fromString(oauthUser.getName());

        var user = userRepository.findById(userId).orElseThrow();

        // Reusamos la lógica de emisión de tokens del AuthService creando una pseudo-sesión.
        // Para que sea simple, generamos directamente vía el flujo de login:
        // (en un proyecto real expondrías un método interno público en AuthService).
        var result = authService.issueTokensForOAuth(user);

        // Refresh token en cookie HttpOnly
        Cookie cookie = new Cookie("refreshToken", result.rawRefreshToken());
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(7 * 24 * 60 * 60);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);

        // Redirige al frontend con el access token en el fragmento (no se loguea en servers)
        String target = frontendOrigin.split(",")[0].trim()
                + "/oauth/callback#access_token="
                + URLEncoder.encode(result.accessToken(), StandardCharsets.UTF_8)
                + "&expires_in=" + result.expiresInSeconds();

        getRedirectStrategy().sendRedirect(request, response, target);
    }
}
