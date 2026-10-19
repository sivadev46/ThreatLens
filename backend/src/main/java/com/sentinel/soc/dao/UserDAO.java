package com.sentinel.soc.dao;

import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.model.User;

import java.sql.*;

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

    public void updateLastLogin(String userId) throws SQLException {
        String sql = "UPDATE users SET last_login_at = NOW() WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, userId);
            stmt.executeUpdate();
        }
    }
}
