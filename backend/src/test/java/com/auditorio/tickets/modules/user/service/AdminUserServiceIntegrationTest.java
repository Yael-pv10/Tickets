package com.auditorio.tickets.modules.user.service;

import com.auditorio.tickets.AbstractIntegrationTest;
import com.auditorio.tickets.common.audit.AuditLogRepository;
import com.auditorio.tickets.common.exception.BusinessException;
import com.auditorio.tickets.common.exception.ResourceNotFoundException;
import com.auditorio.tickets.modules.user.dto.AdminUserDto;
import com.auditorio.tickets.modules.user.dto.CreateStaffMemberRequest;
import com.auditorio.tickets.modules.user.model.Role;
import com.auditorio.tickets.modules.user.model.User;
import com.auditorio.tickets.modules.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests para las reglas de creación y cambio de rol del equipo.
 *
 * Las reglas se prueban directamente sobre el servicio (no por HTTP) para aislar la
 * lógica de negocio del setup de autenticación con MockMvc.
 */
class AdminUserServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired AdminUserService adminUserService;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired AuditLogRepository auditLogRepository;

    private User actingAdmin;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        actingAdmin = userRepository.save(User.builder()
                .email("admin@test.local")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .name("Admin Test")
                .role(Role.ADMIN)
                .enabled(true)
                .build());
    }

    // ---------- createTeamMember ----------

    @Test
    @DisplayName("createTeamMember: admin crea un STAFF con contraseña hasheada")
    void createTeamMember_createsStaffWithHashedPassword() {
        AdminUserDto created = adminUserService.createTeamMember(
                new CreateStaffMemberRequest("staff@test.local", "Nuevo Staff", "Staff123!", Role.STAFF),
                actingAdmin, "127.0.0.1", "test");

        assertThat(created.role()).isEqualTo("STAFF");
        User persisted = userRepository.findByEmailIgnoreCase("staff@test.local").orElseThrow();
        assertThat(persisted.getPasswordHash()).isNotEqualTo("Staff123!");
        assertThat(passwordEncoder.matches("Staff123!", persisted.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("createTeamMember: admin puede crear otro ADMIN")
    void createTeamMember_canCreateAdmin() {
        AdminUserDto created = adminUserService.createTeamMember(
                new CreateStaffMemberRequest("admin2@test.local", "Segundo Admin", "Admin123!", Role.ADMIN),
                actingAdmin, "127.0.0.1", "test");

        assertThat(created.role()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("createTeamMember: rechaza creación con rol CLIENT")
    void createTeamMember_rejectsClientRole() {
        assertThatThrownBy(() -> adminUserService.createTeamMember(
                new CreateStaffMemberRequest("client@test.local", "Falso Cliente", "Client12!", Role.CLIENT),
                actingAdmin, "127.0.0.1", "test"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("auto-registro");

        assertThat(userRepository.existsByEmailIgnoreCase("client@test.local")).isFalse();
    }

    @Test
    @DisplayName("createTeamMember: rechaza email duplicado (case-insensitive)")
    void createTeamMember_rejectsDuplicateEmail() {
        adminUserService.createTeamMember(
                new CreateStaffMemberRequest("dup@test.local", "Uno", "Pass1234!", Role.STAFF),
                actingAdmin, "127.0.0.1", "test");

        assertThatThrownBy(() -> adminUserService.createTeamMember(
                new CreateStaffMemberRequest("DUP@test.local", "Dos", "Pass1234!", Role.STAFF),
                actingAdmin, "127.0.0.1", "test"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ya está registrado");
    }

    // ---------- changeRole ----------

    @Test
    @DisplayName("changeRole: admin no puede cambiar su propio rol")
    void changeRole_adminCannotChangeOwnRole() {
        assertThatThrownBy(() -> adminUserService.changeRole(
                actingAdmin.getId(), Role.STAFF, actingAdmin, "127.0.0.1", "test"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("tu propio rol");

        User refreshed = userRepository.findById(actingAdmin.getId()).orElseThrow();
        assertThat(refreshed.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("changeRole: STAFF puede ser promovido a ADMIN")
    void changeRole_staffToAdmin() {
        User staff = createUser("staff@test.local", Role.STAFF);

        AdminUserDto updated = adminUserService.changeRole(
                staff.getId(), Role.ADMIN, actingAdmin, "127.0.0.1", "test");

        assertThat(updated.role()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("changeRole: ADMIN puede ser degradado a STAFF")
    void changeRole_adminToStaff() {
        User otherAdmin = createUser("other@test.local", Role.ADMIN);

        AdminUserDto updated = adminUserService.changeRole(
                otherAdmin.getId(), Role.STAFF, actingAdmin, "127.0.0.1", "test");

        assertThat(updated.role()).isEqualTo("STAFF");
    }

    @Test
    @DisplayName("changeRole: rechaza promover a un CLIENT existente")
    void changeRole_rejectsPromotingClient() {
        User client = createUser("client@test.local", Role.CLIENT);

        assertThatThrownBy(() -> adminUserService.changeRole(
                client.getId(), Role.STAFF, actingAdmin, "127.0.0.1", "test"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no se promueve");

        User refreshed = userRepository.findById(client.getId()).orElseThrow();
        assertThat(refreshed.getRole()).isEqualTo(Role.CLIENT);
    }

    @Test
    @DisplayName("changeRole: rechaza degradar a CLIENT")
    void changeRole_rejectsTargetClient() {
        User staff = createUser("staff@test.local", Role.STAFF);

        assertThatThrownBy(() -> adminUserService.changeRole(
                staff.getId(), Role.CLIENT, actingAdmin, "127.0.0.1", "test"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("CLIENT");
    }

    @Test
    @DisplayName("changeRole: usuario inexistente → ResourceNotFound")
    void changeRole_userNotFound() {
        assertThatThrownBy(() -> adminUserService.changeRole(
                UUID.randomUUID(), Role.STAFF, actingAdmin, "127.0.0.1", "test"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- helpers ----------

    private User createUser(String email, Role role) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .name("Usuario " + role)
                .role(role)
                .enabled(true)
                .build());
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        auditLogRepository.deleteAll();
        userRepository.deleteAll();
    }
}
