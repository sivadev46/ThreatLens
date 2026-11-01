package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.DetectionRule;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for 'detection_rules' table.
 */
public class DetectionRuleDAO {

    public List<DetectionRule> findAll() throws SQLException {
        String sql = "SELECT id, code, name, description, severity, is_enabled, time_window_seconds, threshold_value, target_event_type FROM detection_rules ORDER BY id ASC";
        List<DetectionRule> rules = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                DetectionRule r = new DetectionRule();
                r.setId(rs.getString("id"));
                r.setCode(rs.getString("code"));
                r.setName(rs.getString("name"));
                r.setDescription(rs.getString("description"));
                r.setSeverity(rs.getString("severity"));
                r.setEnabled(rs.getBoolean("is_enabled"));
                r.setTimeWindowSeconds(rs.getInt("time_window_seconds"));
                r.setThresholdValue(rs.getInt("threshold_value"));
                r.setTargetEventType(rs.getString("target_event_type"));
                rules.add(r);
            }
        }
        return rules;
    }

    public DetectionRule findById(String id) throws SQLException {
        String sql = "SELECT id, code, name, description, severity, is_enabled, time_window_seconds, threshold_value, target_event_type FROM detection_rules WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    DetectionRule r = new DetectionRule();
                    r.setId(rs.getString("id"));
                    r.setCode(rs.getString("code"));
                    r.setName(rs.getString("name"));
                    r.setDescription(rs.getString("description"));
                    r.setSeverity(rs.getString("severity"));
                    r.setEnabled(rs.getBoolean("is_enabled"));
                    r.setTimeWindowSeconds(rs.getInt("time_window_seconds"));
                    r.setThresholdValue(rs.getInt("threshold_value"));
                    r.setTargetEventType(rs.getString("target_event_type"));
                    return r;
                }
            }
        }
        return null;
    }

    public void save(DetectionRule rule) throws SQLException {
        String sql = "INSERT INTO detection_rules (id, code, name, description, severity, enabled, is_enabled, threshold_value, time_window_seconds, target_event_type, explanation) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, rule.getId());
            stmt.setString(2, rule.getCode());
            stmt.setString(3, rule.getName());
            stmt.setString(4, rule.getDescription() != null ? rule.getDescription() : "");
            stmt.setString(5, rule.getSeverity() != null ? rule.getSeverity() : "MEDIUM");
            stmt.setBoolean(6, rule.isEnabled());
            stmt.setBoolean(7, rule.isEnabled());
            stmt.setInt(8, rule.getThresholdValue() > 0 ? rule.getThresholdValue() : 5);
            stmt.setInt(9, rule.getTimeWindowSeconds() > 0 ? rule.getTimeWindowSeconds() : 60);
            stmt.setString(10, rule.getTargetEventType() != null ? rule.getTargetEventType() : "LOGIN_FAILED");
            stmt.setString(11, rule.getExplanation() != null ? rule.getExplanation() : rule.getName());
            stmt.executeUpdate();
        }
    }

    public boolean updateRule(String id, boolean isEnabled, int timeWindowSeconds, int thresholdValue, String severity) throws SQLException {
        String sql = "UPDATE detection_rules SET is_enabled = ?, enabled = ?, time_window_seconds = ?, threshold_value = ?, severity = ?, updated_at = NOW() WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setBoolean(1, isEnabled);
            stmt.setBoolean(2, isEnabled);
            stmt.setInt(3, timeWindowSeconds);
            stmt.setInt(4, thresholdValue);
            stmt.setString(5, severity);
            stmt.setString(6, id);
            return stmt.executeUpdate() > 0;
        }
    }

    public boolean delete(String id) throws SQLException {
        String sql = "DELETE FROM detection_rules WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            return stmt.executeUpdate() > 0;
        }
    }
}
