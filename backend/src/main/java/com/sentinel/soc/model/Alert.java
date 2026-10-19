package com.sentinel.soc.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Alert {
    private String id;
    private String ruleId;
    private String ruleCode;
    private String ruleName;
    private String severity; // CRITICAL, HIGH, MEDIUM, LOW, INFO
    private String status;   // OPEN, INVESTIGATING, RESOLVED
    private String sourceIp;
    private String targetUsername;
    private LocalDateTime timestamp;
    private int eventCount;
    private int timeWindowSeconds;
    private List<String> evidenceLogIds = new ArrayList<>();

    public Alert() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getRuleCode() { return ruleCode; }
    public void setRuleCode(String ruleCode) { this.ruleCode = ruleCode; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSourceIp() { return sourceIp; }
    public void setSourceIp(String sourceIp) { this.sourceIp = sourceIp; }

    public String getTargetUsername() { return targetUsername; }
    public void setTargetUsername(String targetUsername) { this.targetUsername = targetUsername; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public int getEventCount() { return eventCount; }
    public void setEventCount(int eventCount) { this.eventCount = eventCount; }

    public int getTimeWindowSeconds() { return timeWindowSeconds; }
    public void setTimeWindowSeconds(int timeWindowSeconds) { this.timeWindowSeconds = timeWindowSeconds; }

    public List<String> getEvidenceLogIds() { return evidenceLogIds; }
    public void setEvidenceLogIds(List<String> evidenceLogIds) { this.evidenceLogIds = evidenceLogIds; }
}
