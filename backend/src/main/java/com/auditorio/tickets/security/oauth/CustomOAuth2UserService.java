package com.auditorio.tickets.security.oauth;

import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import com.auditorio.tickets.security.CustomUserDetails;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    public CustomOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String googleId = (String) attributes.get("sub");
        String email = (String) attributes.get("email");
        Boolean emailVerified = (Boolean) attributes.getOrDefault("email_verified", false);
        String name = (String) attributes.getOrDefault("name", email);

        if (email == null || Boolean.FALSE.equals(emailVerified)) {
            throw new OAuth2AuthenticationException("El email de Google no está verificado");
        }

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .map(existing -> {
                    if (existing.getGoogleId() == null) existing.setGoogleId(googleId);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(email.toLowerCase())
                        .name(name)
                        .role(Role.CLIENT)
                        .googleId(googleId)
                        .enabled(true)
                        .build()));

        CustomUserDetails details = new CustomUserDetails(user);
        return new DefaultOAuth2User(
                Set.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                attributes,
                "sub"
        ) {
            @Override
            public String getName() {
                return user.getId().toString();
            }

            public CustomUserDetails getDetails() {
                return details;
            }
        };
    }
}
