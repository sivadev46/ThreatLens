package com.sentinel.soc.model;

import java.time.LocalDateTime;

public class BlocklistEntry {
    private String id;
    private String ipAddress;
    private String reason;
    private String addedBy;
    private String status; // ACTIVE, INACTIVE
    private String threatCategory;
    private String threatAsn;
    private LocalDateTime createdAt;

    public BlocklistEntry() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getAddedBy() { return addedBy; }
    public void setAddedBy(String addedBy) { this.addedBy = addedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getThreatCategory() { return threatCategory; }
    public void setThreatCategory(String threatCategory) { this.threatCategory = threatCategory; }

    public String getThreatAsn() { return threatAsn; }
    public void setThreatAsn(String threatAsn) { this.threatAsn = threatAsn; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
