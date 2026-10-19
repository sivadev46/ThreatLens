package com.sentinel.soc.model;

import java.time.LocalDateTime;

public class AuditLogEntry {
    private String id;
    private LocalDateTime timestamp;
    private String actor;
    private String action;
    private String category;
    private String details;
    private String ipAddress;
    private String status; // SUCCESS, FAILURE
    private String hash;

    public AuditLogEntry() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getHash() { return hash; }
    public void setHash(String hash) { this.hash = hash; }
}
