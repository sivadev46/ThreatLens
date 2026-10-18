package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.LogEntry;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for 'log_entries' table.
 * Implements prepared statements and JDBC batching for high-throughput ingestion.
 */
public class LogEntryDAO {

    public void save(LogEntry log) throws SQLException {
        String sql = "INSERT INTO log_entries (id, source_id, timestamp, source_ip, username, event_type, endpoint, status_code, raw_line) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, log.getId());
            stmt.setString(2, log.getSourceId());
            stmt.setTimestamp(3, Timestamp.valueOf(log.getTimestamp()));
            stmt.setString(4, log.getSourceIp());
            stmt.setString(5, log.getUsername());
            stmt.setString(6, log.getEventType());
            stmt.setString(7, log.getEndpoint());
            stmt.setInt(8, log.getStatusCode());
            stmt.setString(9, log.getRawLine());

            stmt.executeUpdate();
        }
    }

    public int saveBatch(List<LogEntry> logs) throws SQLException {
        if (logs == null || logs.isEmpty()) return 0;

        String sql = "INSERT INTO log_entries (id, source_id, timestamp, source_ip, username, event_type, endpoint, status_code, raw_line) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConfig.getConnection()) {
            boolean originalAutoCommit = conn.getAutoCommit();
            conn.setAutoCommit(false);

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                for (LogEntry log : logs) {
                    stmt.setString(1, log.getId());
                    stmt.setString(2, log.getSourceId());
                    stmt.setTimestamp(3, Timestamp.valueOf(log.getTimestamp()));
                    stmt.setString(4, log.getSourceIp());
                    stmt.setString(5, log.getUsername());
                    stmt.setString(6, log.getEventType());
                    stmt.setString(7, log.getEndpoint());
                    stmt.setInt(8, log.getStatusCode());
                    stmt.setString(9, log.getRawLine());
                    stmt.addBatch();
                }

                int[] results = stmt.executeBatch();
                conn.commit();
                return results.length;
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(originalAutoCommit);
            }
        }
    }

    public List<LogEntry> findAll(int limit, int offset) throws SQLException {
        String sql = "SELECT id, source_id, timestamp, source_ip, username, event_type, endpoint, status_code, raw_line " +
                     "FROM log_entries ORDER BY timestamp DESC LIMIT ? OFFSET ?";

        List<LogEntry> list = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, limit);
            stmt.setInt(2, offset);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToLogEntry(rs));
                }
            }
        }
        return list;
    }

    public List<LogEntry> findRecentByIp(String ip, LocalDateTime since) throws SQLException {
        String sql = "SELECT id, source_id, timestamp, source_ip, username, event_type, endpoint, status_code, raw_line " +
                     "FROM log_entries WHERE source_ip = ? AND timestamp >= ? ORDER BY timestamp ASC";

        List<LogEntry> list = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, ip);
            stmt.setTimestamp(2, Timestamp.valueOf(since));

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToLogEntry(rs));
                }
            }
        }
        return list;
    }

    public long countAll() throws SQLException {
        String sql = "SELECT COUNT(*) FROM log_entries";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getLong(1);
            }
        }
        return 0;
    }

    public void deleteAll() throws SQLException {
        String sql = "DELETE FROM log_entries";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.executeUpdate();
        }
    }

    private LogEntry mapResultSetToLogEntry(ResultSet rs) throws SQLException {
        LogEntry log = new LogEntry();
        log.setId(rs.getString("id"));
        log.setSourceId(rs.getString("source_id"));
        Timestamp ts = rs.getTimestamp("timestamp");
        if (ts != null) {
            log.setTimestamp(ts.toLocalDateTime());
        }
        log.setSourceIp(rs.getString("source_ip"));
        log.setUsername(rs.getString("username"));
        log.setEventType(rs.getString("event_type"));
        log.setEndpoint(rs.getString("endpoint"));
        log.setStatusCode(rs.getInt("status_code"));
        log.setRawLine(rs.getString("raw_line"));
        return log;
    }
}
