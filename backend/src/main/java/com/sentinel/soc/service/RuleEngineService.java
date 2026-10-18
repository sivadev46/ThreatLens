package com.sentinel.soc.service;

import com.sentinel.soc.model.Alert;
import com.sentinel.soc.model.DetectionRule;
import com.sentinel.soc.model.LogEntry;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Heuristic sliding-window correlation rule engine.
 */
public class RuleEngineService {

    public List<Alert> evaluateLogs(List<LogEntry> logs, List<DetectionRule> rules, Set<String> activeBlocklistIps) {
        List<Alert> generatedAlerts = new ArrayList<>();
        if (logs == null || logs.isEmpty() || rules == null || rules.isEmpty()) {
            return generatedAlerts;
        }

        // Sort logs ascending by timestamp
        List<LogEntry> sortedLogs = logs.stream()
                .sorted(Comparator.comparing(LogEntry::getTimestamp))
                .collect(Collectors.toList());

        for (DetectionRule rule : rules) {
            if (!rule.isEnabled()) continue;

            if ("RULE_BLOCKLIST_IP".equalsIgnoreCase(rule.getCode())) {
                // Immediate zero-tolerance evaluation
                for (LogEntry log : sortedLogs) {
                    if (activeBlocklistIps.contains(log.getSourceIp())) {
                        Alert alert = new Alert();
                        alert.setId("alt-" + UUID.randomUUID().toString());
                        alert.setRuleId(rule.getId());
                        alert.setRuleCode(rule.getCode());
                        alert.setRuleName(rule.getName());
                        alert.setSeverity(rule.getSeverity());
                        alert.setStatus("OPEN");
                        alert.setSourceIp(log.getSourceIp());
                        alert.setTargetUsername(log.getUsername());
                        alert.setTimestamp(log.getTimestamp());
                        alert.setEventCount(1);
                        alert.setTimeWindowSeconds(1);
                        alert.setEvidenceLogIds(Collections.singletonList(log.getId()));
                        generatedAlerts.add(alert);
                    }
                }
            } else {
                // Windowed aggregation per IP
                Map<String, List<LogEntry>> ipGroups = sortedLogs.stream()
                        .filter(l -> "ALL".equalsIgnoreCase(rule.getTargetEventType()) || l.getEventType().equalsIgnoreCase(rule.getTargetEventType()))
                        .collect(Collectors.groupingBy(LogEntry::getSourceIp));

                for (Map.Entry<String, List<LogEntry>> entry : ipGroups.entrySet()) {
                    String ip = entry.getKey();
                    List<LogEntry> events = entry.getValue();

                    // Sliding window scan
                    for (int i = 0; i < events.size(); i++) {
                        LogEntry startEvent = events.get(i);
                        LocalDateTime windowEnd = startEvent.getTimestamp().plusSeconds(rule.getTimeWindowSeconds());

                        List<LogEntry> inWindow = new ArrayList<>();
                        for (int j = i; j < events.size(); j++) {
                            LogEntry candidate = events.get(j);
                            if (!candidate.getTimestamp().isAfter(windowEnd)) {
                                inWindow.add(candidate);
                            } else {
                                break;
                            }
                        }

                        if (inWindow.size() >= rule.getThresholdValue()) {
                            Alert alert = new Alert();
                            alert.setId("alt-" + UUID.randomUUID().toString());
                            alert.setRuleId(rule.getId());
                            alert.setRuleCode(rule.getCode());
                            alert.setRuleName(rule.getName());
                            alert.setSeverity(rule.getSeverity());
                            alert.setStatus("OPEN");
                            alert.setSourceIp(ip);
                            alert.setTargetUsername(inWindow.get(inWindow.size() - 1).getUsername());
                            alert.setTimestamp(inWindow.get(inWindow.size() - 1).getTimestamp());
                            alert.setEventCount(inWindow.size());
                            alert.setTimeWindowSeconds(rule.getTimeWindowSeconds());
                            alert.setEvidenceLogIds(inWindow.stream().map(LogEntry::getId).collect(Collectors.toList()));
                            generatedAlerts.add(alert);

                            // Advance past this window to avoid duplicate alert cascades
                            i += inWindow.size() - 1;
                        }
                    }
                }
            }
        }

        return generatedAlerts;
    }
}
