package com.auditorio.tickets.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;

/**
 * Replaces the default async executor with a synchronous one so {@code @Async} methods
 * run on the calling thread during tests. This lets us assert side-effects (audit log
 * rows, emails, etc.) immediately after the triggering call, and lets exceptions inside
 * async methods surface to the test instead of being silently logged.
 */
@TestConfiguration
public class SyncAsyncTestConfig {

    @Bean
    @Primary
    public TaskExecutor taskExecutor() {
        return new SyncTaskExecutor();
    }
}
