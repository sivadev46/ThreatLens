package com.sentinel.soc.model;

import java.time.LocalDateTime;

public class DetectionRule {
    private String id;
    private String code;
    private String name;
    private String description;
    private String severity;
    private boolean enabled;
    private int thresholdValue;
    private int timeWindowSeconds;
    private String targetEventType;
    private String explanation;
    private int totalTriggerCount;
    private LocalDateTime lastTriggered;

    public DetectionRule() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public int getThresholdValue() { return thresholdValue; }
    public void setThresholdValue(int thresholdValue) { this.thresholdValue = thresholdValue; }

    public int getTimeWindowSeconds() { return timeWindowSeconds; }
    public void setTimeWindowSeconds(int timeWindowSeconds) { this.timeWindowSeconds = timeWindowSeconds; }

    public String getTargetEventType() { return targetEventType; }
    public void setTargetEventType(String targetEventType) { this.targetEventType = targetEventType; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public int getTotalTriggerCount() { return totalTriggerCount; }
    public void setTotalTriggerCount(int totalTriggerCount) { this.totalTriggerCount = totalTriggerCount; }

    public LocalDateTime getLastTriggered() { return lastTriggered; }
    public void setLastTriggered(LocalDateTime lastTriggered) { this.lastTriggered = lastTriggered; }
}
