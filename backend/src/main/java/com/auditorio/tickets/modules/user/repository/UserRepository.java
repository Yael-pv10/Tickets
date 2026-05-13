package com.auditorio.tickets.modules.user.repository;

import com.auditorio.tickets.modules.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByGoogleId(String googleId);
    boolean existsByEmailIgnoreCase(String email);
}
