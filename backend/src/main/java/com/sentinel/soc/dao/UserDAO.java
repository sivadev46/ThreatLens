package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for 'users' table.
 */
public class UserDAO {

    public User findByUsername(String username) throws SQLException {
        String sql = "SELECT id, username, password_hash, full_name, email, role, avatar_color, is_active FROM users WHERE username = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, username);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    User u = new User();
                    u.setId(rs.getString("id"));
                    u.setUsername(rs.getString("username"));
                    u.setPasswordHash(rs.getString("password_hash"));
                    u.setFullName(rs.getString("full_name"));
                    u.setEmail(rs.getString("email"));
                    u.setRole(rs.getString("role"));
                    u.setAvatarColor(rs.getString("avatar_color"));
                    u.setActive(rs.getBoolean("is_active"));
                    return u;
                }
            }
        }
        return null;
    }

    public List<User> findAll() throws SQLException {
        String sql = "SELECT id, username, full_name, email, role, avatar_color, is_active, created_at, last_login FROM users ORDER BY created_at DESC";
        List<User> list = new ArrayList<>();
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                User u = new User();
                u.setId(rs.getString("id"));
                u.setUsername(rs.getString("username"));
                u.setFullName(rs.getString("full_name"));
                u.setEmail(rs.getString("email"));
                u.setRole(rs.getString("role"));
                u.setAvatarColor(rs.getString("avatar_color"));
                u.setActive(rs.getBoolean("is_active"));
                Timestamp ct = rs.getTimestamp("created_at");
                if (ct != null) u.setCreatedAt(ct.toLocalDateTime());
                Timestamp lt = rs.getTimestamp("last_login");
                if (lt != null) u.setLastLogin(lt.toLocalDateTime());
                list.add(u);
            }
        }
        return list;
    }

    public User findById(String id) throws SQLException {
        String sql = "SELECT id, username, password_hash, full_name, email, role, avatar_color, is_active FROM users WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    User u = new User();
                    u.setId(rs.getString("id"));
                    u.setUsername(rs.getString("username"));
                    u.setPasswordHash(rs.getString("password_hash"));
                    u.setFullName(rs.getString("full_name"));
                    u.setEmail(rs.getString("email"));
                    u.setRole(rs.getString("role"));
                    u.setAvatarColor(rs.getString("avatar_color"));
                    u.setActive(rs.getBoolean("is_active"));
                    return u;
                }
            }
        }
        return null;
    }

    public void save(User user) throws SQLException {
        String sql = "INSERT INTO users (id, username, password_hash, full_name, email, role, avatar_color, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, user.getId());
            stmt.setString(2, user.getUsername());
            stmt.setString(3, user.getPasswordHash());
            stmt.setString(4, user.getFullName());
            stmt.setString(5, user.getEmail());
            stmt.setString(6, user.getRole() != null ? user.getRole() : "SOC Analyst");
            stmt.setString(7, user.getAvatarColor() != null ? user.getAvatarColor() : "#3b82f6");
            stmt.setBoolean(8, user.isActive());
            stmt.executeUpdate();
        }
    }

    public boolean update(User user) throws SQLException {
        String sql = "UPDATE users SET full_name = ?, email = ?, role = ?, avatar_color = ?, is_active = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, user.getFullName());
            stmt.setString(2, user.getEmail());
            stmt.setString(3, user.getRole());
            stmt.setString(4, user.getAvatarColor());
            stmt.setBoolean(5, user.isActive());
            stmt.setString(6, user.getId());
            return stmt.executeUpdate() > 0;
        }
    }

    public boolean delete(String userId) throws SQLException {
        String sql = "DELETE FROM users WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, userId);
            return stmt.executeUpdate() > 0;
        }
    }

    public void updateLastLogin(String userId) throws SQLException {
        String sql = "UPDATE users SET last_login = NOW(), last_login_at = NOW() WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, userId);
            stmt.executeUpdate();
        }
    }
}
