package com.auditorio.tickets.common.audit;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Async
    public void log(UUID userId, String action, String entity, String entityId,
                    String ip, String userAgent, String metadataJson) {
        AuditLog entry = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .ip(ip)
                .userAgent(userAgent)
                .metadata(metadataJson)
                .build();
        repository.save(entry);
    }
}
