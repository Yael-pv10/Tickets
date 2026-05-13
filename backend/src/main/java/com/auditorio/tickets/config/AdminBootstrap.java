package com.auditorio.tickets.config;

import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.info("AdminBootstrap: app.bootstrap.admin-email/password no configurados, se omite.");
            return;
        }
        String normalized = adminEmail.toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            log.info("AdminBootstrap: admin '{}' ya existe.", normalized);
            return;
        }
        User admin = User.builder()
                .email(normalized)
                .name("Administrador")
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(Role.ADMIN)
                .enabled(true)
                .build();
        userRepository.save(admin);
        log.warn("AdminBootstrap: admin '{}' creado. Cambia la contraseña en el primer login.", normalized);
    }
}
