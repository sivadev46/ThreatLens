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

    public boolean updateRule(String id, boolean isEnabled, int timeWindowSeconds, int thresholdValue, String severity) throws SQLException {
        String sql = "UPDATE detection_rules SET is_enabled = ?, time_window_seconds = ?, threshold_value = ?, severity = ?, updated_at = NOW() WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setBoolean(1, isEnabled);
            stmt.setInt(2, timeWindowSeconds);
            stmt.setInt(3, thresholdValue);
            stmt.setString(4, severity);
            stmt.setString(5, id);
            return stmt.executeUpdate() > 0;
        }
    }
}
