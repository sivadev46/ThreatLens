package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.BlocklistEntry;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Data Access Object for 'ip_blocklist' table.
 */
public class BlocklistDAO {

    public void save(BlocklistEntry entry) throws SQLException {
        String sql = "INSERT INTO ip_blocklist (id, ip_address, reason, added_by, status, added_at) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, entry.getId());
            stmt.setString(2, entry.getIpAddress());
            stmt.setString(3, entry.getReason());
            stmt.setString(4, entry.getAddedBy());
            stmt.setString(5, entry.getStatus() != null ? entry.getStatus() : "ACTIVE");
            stmt.setTimestamp(6, Timestamp.valueOf(entry.getAddedAt() != null ? entry.getAddedAt() : LocalDateTime.now()));
            stmt.executeUpdate();
        }
    }

    public List<BlocklistEntry> findAll() throws SQLException {
        String sql = "SELECT id, ip_address, reason, added_by, status, added_at, expires_at FROM ip_blocklist ORDER BY added_at DESC";
        List<BlocklistEntry> list = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                BlocklistEntry entry = new BlocklistEntry();
                entry.setId(rs.getString("id"));
                entry.setIpAddress(rs.getString("ip_address"));
                entry.setReason(rs.getString("reason"));
                entry.setAddedBy(rs.getString("added_by"));
                entry.setStatus(rs.getString("status"));
                Timestamp added = rs.getTimestamp("added_at");
                if (added != null) entry.setAddedAt(added.toLocalDateTime());
                Timestamp exp = rs.getTimestamp("expires_at");
                if (exp != null) entry.setExpiresAt(exp.toLocalDateTime());
                list.add(entry);
            }
        }
        return list;
    }

    public Set<String> getActiveBlockedIps() throws SQLException {
        String sql = "SELECT ip_address FROM ip_blocklist WHERE status = 'ACTIVE'";
        Set<String> set = new HashSet<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                set.add(rs.getString("ip_address"));
            }
        }
        return set;
    }

    public boolean updateStatus(String id, String newStatus) throws SQLException {
        String sql = "UPDATE ip_blocklist SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, newStatus);
            stmt.setString(2, id);
            return stmt.executeUpdate() > 0;
        }
    }

    public boolean delete(String id) throws SQLException {
        String sql = "DELETE FROM ip_blocklist WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            return stmt.executeUpdate() > 0;
        }
    }
}
