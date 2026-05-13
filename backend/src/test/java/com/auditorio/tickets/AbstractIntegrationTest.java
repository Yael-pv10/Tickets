package com.auditorio.tickets;

import com.auditorio.tickets.config.SyncAsyncTestConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

/**
 * Base class for integration tests.
 *
 * Provides:
 * - A shared, JVM-wide PostgreSQL container (via Testcontainers + Spring Boot's
 *   {@code @ServiceConnection}, which auto-wires the JDBC properties).
 * - An RSA key pair generated on first load and written to a temp directory,
 *   exposed via {@code app.jwt.{private,public}-key-path}. Avoids checking
 *   PEM files into the repo.
 * - The {@code test} profile, which uses dummy QR/OAuth/admin values and a
 *   relaxed rate limit (see {@code application-test.yml}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(SyncAsyncTestConfig.class)
public abstract class AbstractIntegrationTest {

    // Singleton container pattern: started once per JVM via static initializer,
    // shared across all test classes. Testcontainers' Ryuk daemon cleans it up
    // when the JVM exits. We use @DynamicPropertySource (instead of
    // @ServiceConnection, which requires @Container-managed lifecycle) so Spring
    // picks up the dynamically allocated JDBC URL.
    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
        POSTGRES.start();
    }

    private static final Path PRIVATE_KEY_PATH;
    private static final Path PUBLIC_KEY_PATH;

    static {
        try {
            Path tempDir = Files.createTempDirectory("tickets-test-jwt-keys-");
            tempDir.toFile().deleteOnExit();

            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            KeyPair kp = kpg.generateKeyPair();

            PRIVATE_KEY_PATH = tempDir.resolve("private.pem");
            PUBLIC_KEY_PATH = tempDir.resolve("public.pem");
            writePem(PRIVATE_KEY_PATH, "PRIVATE KEY", kp.getPrivate().getEncoded());
            writePem(PUBLIC_KEY_PATH, "PUBLIC KEY", kp.getPublic().getEncoded());

            PRIVATE_KEY_PATH.toFile().deleteOnExit();
            PUBLIC_KEY_PATH.toFile().deleteOnExit();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate test JWT keys", e);
        }
    }

    @DynamicPropertySource
    static void datasourceAndJwtProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.jwt.private-key-path", PRIVATE_KEY_PATH::toString);
        registry.add("app.jwt.public-key-path", PUBLIC_KEY_PATH::toString);
    }

    private static void writePem(Path path, String label, byte[] der) throws IOException {
        String body = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(der);
        String pem = "-----BEGIN " + label + "-----\n" + body + "\n-----END " + label + "-----\n";
        Files.writeString(path, pem);
    }
}
