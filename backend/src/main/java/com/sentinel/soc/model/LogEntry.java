package com.sentinel.soc.model;

import java.time.LocalDateTime;

public class LogEntry {
    private String id;
    private String sourceId;
    private LocalDateTime timestamp;
    private String sourceIp;
    private String username;
    private String eventType; // LOGIN_SUCCESS, LOGIN_FAILED, HTTP_REQUEST, LOGOUT
    private String endpoint;
    private int statusCode;
    private String rawLine;
    private String logSource;

    public LogEntry() {}

    public LogEntry(String id, LocalDateTime timestamp, String sourceIp, String username, String eventType, String endpoint, int statusCode, String rawLine) {
        this.id = id;
        this.timestamp = timestamp;
        this.sourceIp = sourceIp;
        this.username = username;
        this.eventType = eventType;
        this.endpoint = endpoint;
        this.statusCode = statusCode;
        this.rawLine = rawLine;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSourceId() { return sourceId; }
    public void setSourceId(String sourceId) { this.sourceId = sourceId; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getSourceIp() { return sourceIp; }
    public void setSourceIp(String sourceIp) { this.sourceIp = sourceIp; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public int getStatusCode() { return statusCode; }
    public void setStatusCode(int statusCode) { this.statusCode = statusCode; }

    public String getRawLine() { return rawLine; }
    public void setRawLine(String rawLine) { this.rawLine = rawLine; }

    public String getLogSource() { return logSource; }
    public void setLogSource(String logSource) { this.logSource = logSource; }
}
