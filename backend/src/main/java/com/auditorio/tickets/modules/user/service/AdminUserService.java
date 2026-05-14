package com.auditorio.tickets.modules.user.service;

import com.auditorio.tickets.common.audit.AuditService;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.user.dto.AdminUserDto;
import com.auditorio.tickets.modules.user.dto.CreateStaffMemberRequest;
import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Reglas de negocio para la gestión administrativa de usuarios.
 *
 * Reglas clave:
 *   1. Los CLIENT solo se crean por auto-registro (AuthService.register). El admin no
 *      puede crear ni promover a CLIENT desde aquí.
 *   2. El admin puede crear STAFF o ADMIN desde cero (cuentas separadas de cualquier
 *      cliente existente).
 *   3. Cambios de rol solo entre STAFF ↔ ADMIN. Nunca involucran CLIENT.
 *   4. Un admin no puede modificar su propio rol (anti-lockout: evita autodegradación).
 */
@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public AdminUserService(UserRepository userRepository,
                            PasswordEncoder passwordEncoder,
                            AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional
    public AdminUserDto createTeamMember(CreateStaffMemberRequest request, User actingAdmin,
                                         String ip, String userAgent) {
        if (request.role() == Role.CLIENT) {
            throw new BusinessException("Los clientes solo se crean por auto-registro");
        }
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BusinessException("El email ya está registrado");
        }
        User created = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name().trim())
                .role(request.role())
                .enabled(true)
                .build();
        userRepository.save(created);
        auditService.log(actingAdmin.getId(), "USER_CREATED_BY_ADMIN", "users",
                created.getId().toString(), ip, userAgent, null);
        return AdminUserDto.fromEntity(created);
    }

    @Transactional
    public AdminUserDto changeRole(UUID userId, Role newRole, User actingAdmin,
                                   String ip, String userAgent) {
        if (userId.equals(actingAdmin.getId())) {
            throw new BusinessException("No puedes cambiar tu propio rol");
        }
        if (newRole == Role.CLIENT) {
            throw new BusinessException("No se permite cambiar a rol CLIENT desde aquí");
        }
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (target.getRole() == Role.CLIENT) {
            throw new BusinessException(
                    "Un CLIENT no se promueve. Crea una cuenta de equipo nueva con email distinto.");
        }
        if (target.getRole() == newRole) {
            return AdminUserDto.fromEntity(target);
        }
        Role previous = target.getRole();
        target.setRole(newRole);
        userRepository.save(target);
        auditService.log(actingAdmin.getId(), "USER_ROLE_CHANGED", "users",
                target.getId().toString(), ip, userAgent,
                "{\"from\":\"" + previous + "\",\"to\":\"" + newRole + "\"}");
        return AdminUserDto.fromEntity(target);
    }
}
