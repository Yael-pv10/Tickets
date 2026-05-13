package com.auditorio.tickets.security.jwt;

import com.auditorio.tickets.modules.user.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    private final JwtProperties props;
    private PrivateKey privateKey;
    private PublicKey publicKey;

    public JwtService(JwtProperties props) {
        this.props = props;
    }

    @PostConstruct
    void loadKeys() throws Exception {
        this.privateKey = loadPrivateKey(props.privateKeyPath());
        this.publicKey = loadPublicKey(props.publicKeyPath());
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .issuer(props.issuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(props.accessExpirationMin(), ChronoUnit.MINUTES)))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    public Claims parseAndValidate(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer(props.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public int getAccessExpirationMin() {
        return props.accessExpirationMin();
    }

    public int getRefreshExpirationDays() {
        return props.refreshExpirationDays();
    }

    private static PrivateKey loadPrivateKey(String path) throws Exception {
        String content = stripPem(Files.readString(Path.of(path)), "PRIVATE KEY");
        byte[] bytes = Base64.getDecoder().decode(content);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(bytes);
        return KeyFactory.getInstance("RSA").generatePrivate(spec);
    }

    private static PublicKey loadPublicKey(String path) throws Exception {
        String content = stripPem(Files.readString(Path.of(path)), "PUBLIC KEY");
        byte[] bytes = Base64.getDecoder().decode(content);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(bytes);
        return KeyFactory.getInstance("RSA").generatePublic(spec);
    }

    private static String stripPem(String pem, String label) {
        return pem
                .replace("-----BEGIN " + label + "-----", "")
                .replace("-----END " + label + "-----", "")
                .replaceAll("\\s", "");
    }
}
