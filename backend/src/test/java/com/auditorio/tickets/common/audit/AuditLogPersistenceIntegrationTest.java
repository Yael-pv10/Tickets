package com.auditorio.tickets.common.audit;

import com.auditorio.tickets.AbstractIntegrationTest;
import com.auditorio.tickets.modules.auth.dto.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression test for the audit_log jsonb mapping bug.
 *
 * Before the fix, AuditService.log() failed with
 *   "ERROR: column \"metadata\" is of type jsonb but expression is of type character varying"
 * because the entity's String field was mapped as varchar. The error was swallowed by
 * @Async, so audit rows were never persisted in production.
 *
 * SyncAsyncTestConfig (imported by AbstractIntegrationTest) replaces the async executor
 * with a synchronous one, so any failure inside AuditService.log surfaces immediately
 * and we can assert on the audit_log table right after the triggering HTTP call.
 */
class AuditLogPersistenceIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired AuditLogRepository auditLogRepository;

    @BeforeEach
    void cleanAuditLog() {
        auditLogRepository.deleteAll();
    }

    @Test
    @DisplayName("Un registro exitoso persiste una fila USER_REGISTERED en audit_log")
    void register_persists_user_registered_audit_row() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "audit.test@auditorio.local", "Sup3rSecret!", "Audit Test");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        List<AuditLog> rows = auditLogRepository.findAll();
        assertThat(rows).hasSize(1);
        AuditLog row = rows.get(0);
        assertThat(row.getAction()).isEqualTo("USER_REGISTERED");
        assertThat(row.getEntity()).isEqualTo("users");
        assertThat(row.getUserId()).isNotNull();
        assertThat(row.getCreatedAt()).isNotNull();
    }
}
