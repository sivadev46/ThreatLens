package com.sentinel.soc.service;

import com.sentinel.soc.dao.AlertDAO;
import com.sentinel.soc.dao.BlocklistDAO;
import com.sentinel.soc.model.Alert;
import com.sentinel.soc.model.BlocklistEntry;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for SOC alert management, status workflows, and active remediation.
 */
public class AlertService {
    private final AlertDAO alertDAO = new AlertDAO();
    private final BlocklistDAO blocklistDAO = new BlocklistDAO();
    private final AuditService auditService = new AuditService();

    public List<Alert> getAlerts(String status, String severity, int limit) throws Exception {
        return alertDAO.findAll(status, severity, limit);
    }

    public Alert getAlertById(String id) throws Exception {
        return alertDAO.findById(id);
    }

    public boolean updateStatus(String alertId, String newStatus, String reason, String actor) throws Exception {
        boolean updated = alertDAO.updateStatus(alertId, newStatus, reason, actor);
        if (updated) {
            auditService.recordEvent(
                actor,
                "UPDATE_ALERT_STATUS",
                "INCIDENT_RESPONSE",
                "Alert " + alertId + " status updated to " + newStatus + (reason != null ? " (" + reason + ")" : ""),
                "127.0.0.1"
            );
        }
        return updated;
    }

    public void addNote(String alertId, String author, String noteText) throws Exception {
        alertDAO.addNote(alertId, author, noteText);
        auditService.recordEvent(
            author,
            "ADD_ALERT_NOTE",
            "INCIDENT_RESPONSE",
            "Note added to alert " + alertId + ": " + noteText,
            "127.0.0.1"
        );
    }

    public boolean blockIpFromAlert(String alertId, String ip, String reason, String actor) throws Exception {
        BlocklistEntry entry = new BlocklistEntry();
        entry.setId("blk-" + UUID.randomUUID().toString());
        entry.setIpAddress(ip);
        entry.setReason(reason != null ? reason : "Remediation from alert " + alertId);
        entry.setAddedBy(actor);
        entry.setStatus("ACTIVE");
        entry.setAddedAt(LocalDateTime.now());

        blocklistDAO.save(entry);
        auditService.recordEvent(
            actor,
            "ADD_BLOCKLIST_IP",
            "REMEDIATION",
            "Blocked IP " + ip + " directly from alert " + alertId + " (" + entry.getReason() + ")",
            "127.0.0.1"
        );
        return true;
    }
}
