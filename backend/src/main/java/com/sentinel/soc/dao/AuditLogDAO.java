package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.AuditLogEntry;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for 'audit_logs' table with cryptographic hash integrity linking.
 */
public class AuditLogDAO {

    public String getLastEntryHash() throws SQLException {
        String sql = "SELECT entry_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getString("entry_hash");
            }
        }
        return "GENESIS_HASH_SENTINEL_SOC_0000000000000000";
    }

    public void save(AuditLogEntry entry) throws SQLException {
        String sql = "INSERT INTO audit_logs (id, timestamp, actor, action, category, details, ip_address, previous_hash, entry_hash) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, entry.getId());
            stmt.setTimestamp(2, Timestamp.valueOf(entry.getTimestamp() != null ? entry.getTimestamp() : LocalDateTime.now()));
            stmt.setString(3, entry.getActor());
            stmt.setString(4, entry.getAction());
            stmt.setString(5, entry.getCategory());
            stmt.setString(6, entry.getDetails());
            stmt.setString(7, entry.getIpAddress());
            stmt.setString(8, entry.getPreviousHash());
            stmt.setString(9, entry.getEntryHash());
            stmt.executeUpdate();
        }
    }

    public List<AuditLogEntry> findAll(int limit) throws SQLException {
        String sql = "SELECT id, timestamp, actor, action, category, details, ip_address, previous_hash, entry_hash " +
                     "FROM audit_logs ORDER BY timestamp DESC LIMIT ?";
        List<AuditLogEntry> list = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, limit > 0 ? limit : 100);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    AuditLogEntry entry = new AuditLogEntry();
                    entry.setId(rs.getString("id"));
                    Timestamp ts = rs.getTimestamp("timestamp");
                    if (ts != null) entry.setTimestamp(ts.toLocalDateTime());
                    entry.setActor(rs.getString("actor"));
                    entry.setAction(rs.getString("action"));
                    entry.setCategory(rs.getString("category"));
                    entry.setDetails(rs.getString("details"));
                    entry.setIpAddress(rs.getString("ip_address"));
                    entry.setPreviousHash(rs.getString("previous_hash"));
                    entry.setEntryHash(rs.getString("entry_hash"));
                    list.add(entry);
                }
            }
        }
        return list;
    }
}
