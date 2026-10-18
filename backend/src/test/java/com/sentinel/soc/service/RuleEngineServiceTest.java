package com.sentinel.soc.service;

import com.sentinel.soc.model.Alert;
import com.sentinel.soc.model.DetectionRule;
import com.sentinel.soc.model.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class RuleEngineServiceTest {
    private RuleEngineService engine;

    @BeforeEach
    public void setup() {
        engine = new RuleEngineService();
    }

    @Test
    @DisplayName("Should detect brute force when failed logins meet or exceed threshold within window")
    public void testBruteForceDetection() {
        DetectionRule rule = new DetectionRule();
        rule.setId("rule-001");
        rule.setCode("RULE_BRUTE_FORCE");
        rule.setName("Brute Force Detection");
        rule.setEnabled(true);
        rule.setSeverity("HIGH");
        rule.setTargetEventType("LOGIN_FAILED");
        rule.setThresholdValue(3);
        rule.setTimeWindowSeconds(60);

        List<LogEntry> logs = new ArrayList<>();
        LocalDateTime baseTime = LocalDateTime.of(2026, 3, 14, 12, 0, 0);

        for (int i = 0; i < 4; i++) {
            LogEntry log = new LogEntry();
            log.setId("log-" + i);
            log.setTimestamp(baseTime.plusSeconds(i * 10));
            log.setSourceIp("198.51.100.42");
            log.setUsername("root");
            log.setEventType("LOGIN_FAILED");
            log.setEndpoint("/login");
            logs.add(log);
        }

        List<Alert> alerts = engine.evaluateLogs(logs, Collections.singletonList(rule), Collections.emptySet());

        assertEquals(1, alerts.size());
        Alert alert = alerts.get(0);
        assertEquals("RULE_BRUTE_FORCE", alert.getRuleCode());
        assertEquals("198.51.100.42", alert.getSourceIp());
        assertEquals("HIGH", alert.getSeverity());
        assertTrue(alert.getEventCount() >= 3);
    }

    @Test
    @DisplayName("Should immediately trigger alert for any traffic from blocked IP")
    public void testBlocklistImmediateAlert() {
        DetectionRule rule = new DetectionRule();
        rule.setId("rule-003");
        rule.setCode("RULE_BLOCKLIST_IP");
        rule.setName("Known Threat Actor Activity");
        rule.setEnabled(true);
        rule.setSeverity("CRITICAL");
        rule.setTargetEventType("ALL");
        rule.setThresholdValue(1);
        rule.setTimeWindowSeconds(1);

        Set<String> blocklist = new HashSet<>(Collections.singletonList("203.0.113.99"));

        LogEntry log = new LogEntry();
        log.setId("log-blk-1");
        log.setTimestamp(LocalDateTime.now());
        log.setSourceIp("203.0.113.99");
        log.setUsername("admin");
        log.setEventType("HTTP_REQUEST");
        log.setEndpoint("/api/admin");

        List<Alert> alerts = engine.evaluateLogs(Collections.singletonList(log), Collections.singletonList(rule), blocklist);

        assertEquals(1, alerts.size());
        assertEquals("RULE_BLOCKLIST_IP", alerts.get(0).getRuleCode());
        assertEquals("CRITICAL", alerts.get(0).getSeverity());
    }
}
