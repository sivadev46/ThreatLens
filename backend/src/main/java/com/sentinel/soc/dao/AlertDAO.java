package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.Alert;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Data Access Object for 'alerts', 'alert_evidence', and 'alert_notes' tables.
 */
public class AlertDAO {

    public void save(Alert alert) throws SQLException {
        String insertAlertSql = "INSERT INTO alerts (id, rule_id, rule_code, rule_name, severity, status, source_ip, target_username, timestamp, event_count, time_window_seconds) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        String insertEvidenceSql = "INSERT INTO alert_evidence (alert_id, log_id) VALUES (?, ?)";

        try (Connection conn = DatabaseConfig.getConnection()) {
            boolean originalAutoCommit = conn.getAutoCommit();
            conn.setAutoCommit(false);

            try (PreparedStatement stmt = conn.prepareStatement(insertAlertSql)) {
                stmt.setString(1, alert.getId());
                stmt.setString(2, alert.getRuleId());
                stmt.setString(3, alert.getRuleCode());
                stmt.setString(4, alert.getRuleName());
                stmt.setString(5, alert.getSeverity());
                stmt.setString(6, alert.getStatus() != null ? alert.getStatus() : "OPEN");
                stmt.setString(7, alert.getSourceIp());
                stmt.setString(8, alert.getTargetUsername());
                stmt.setTimestamp(9, Timestamp.valueOf(alert.getTimestamp() != null ? alert.getTimestamp() : LocalDateTime.now()));
                stmt.setInt(10, alert.getEventCount());
                stmt.setInt(11, alert.getTimeWindowSeconds());
                stmt.executeUpdate();

                if (alert.getEvidenceLogIds() != null && !alert.getEvidenceLogIds().isEmpty()) {
                    try (PreparedStatement evStmt = conn.prepareStatement(insertEvidenceSql)) {
                        for (String logId : alert.getEvidenceLogIds()) {
                            evStmt.setString(1, alert.getId());
                            evStmt.setString(2, logId);
                            evStmt.addBatch();
                        }
                        evStmt.executeBatch();
                    }
                }

                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(originalAutoCommit);
            }
        }
    }

    public List<Alert> findAll(String statusFilter, String severityFilter, int limit) throws SQLException {
        StringBuilder sql = new StringBuilder("SELECT id, rule_id, rule_code, rule_name, severity, status, source_ip, target_username, timestamp, event_count, time_window_seconds, assigned_to, resolution_reason FROM alerts WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (statusFilter != null && !statusFilter.isEmpty() && !"ALL".equalsIgnoreCase(statusFilter)) {
            sql.append("AND status = ? ");
            params.add(statusFilter);
        }
        if (severityFilter != null && !severityFilter.isEmpty() && !"ALL".equalsIgnoreCase(severityFilter)) {
            sql.append("AND severity = ? ");
            params.add(severityFilter);
        }

        sql.append("ORDER BY timestamp DESC LIMIT ?");
        params.add(limit > 0 ? limit : 100);

        List<Alert> list = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                stmt.setObject(i + 1, params.get(i));
            }

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Alert a = new Alert();
                    a.setId(rs.getString("id"));
                    a.setRuleId(rs.getString("rule_id"));
                    a.setRuleCode(rs.getString("rule_code"));
                    a.setRuleName(rs.getString("rule_name"));
                    a.setSeverity(rs.getString("severity"));
                    a.setStatus(rs.getString("status"));
                    a.setSourceIp(rs.getString("source_ip"));
                    a.setTargetUsername(rs.getString("target_username"));
                    Timestamp ts = rs.getTimestamp("timestamp");
                    if (ts != null) a.setTimestamp(ts.toLocalDateTime());
                    a.setEventCount(rs.getInt("event_count"));
                    a.setTimeWindowSeconds(rs.getInt("time_window_seconds"));
                    a.setAssignedTo(rs.getString("assigned_to"));
                    a.setResolutionReason(rs.getString("resolution_reason"));
                    list.add(a);
                }
            }
        }
        return list;
    }

    public Alert findById(String id) throws SQLException {
        String sql = "SELECT id, rule_id, rule_code, rule_name, severity, status, source_ip, target_username, timestamp, event_count, time_window_seconds, assigned_to, resolution_reason FROM alerts WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    Alert a = new Alert();
                    a.setId(rs.getString("id"));
                    a.setRuleId(rs.getString("rule_id"));
                    a.setRuleCode(rs.getString("rule_code"));
                    a.setRuleName(rs.getString("rule_name"));
                    a.setSeverity(rs.getString("severity"));
                    a.setStatus(rs.getString("status"));
                    a.setSourceIp(rs.getString("source_ip"));
                    a.setTargetUsername(rs.getString("target_username"));
                    Timestamp ts = rs.getTimestamp("timestamp");
                    if (ts != null) a.setTimestamp(ts.toLocalDateTime());
                    a.setEventCount(rs.getInt("event_count"));
                    a.setTimeWindowSeconds(rs.getInt("time_window_seconds"));
                    a.setAssignedTo(rs.getString("assigned_to"));
                    a.setResolutionReason(rs.getString("resolution_reason"));
                    return a;
                }
            }
        }
        return null;
    }

    public boolean updateStatus(String alertId, String newStatus, String resolutionReason, String resolvedBy) throws SQLException {
        String sql = "UPDATE alerts SET status = ?, resolution_reason = ?, resolved_at = NOW(), resolved_by = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, newStatus);
            stmt.setString(2, resolutionReason);
            stmt.setString(3, resolvedBy);
            stmt.setString(4, alertId);
            return stmt.executeUpdate() > 0;
        }
    }

    public void addNote(String alertId, String author, String noteText) throws SQLException {
        String sql = "INSERT INTO alert_notes (alert_id, author, note_text, created_at) VALUES (?, ?, ?, NOW())";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, alertId);
            stmt.setString(2, author);
            stmt.setString(3, noteText);
            stmt.executeUpdate();
        }
    }
}
