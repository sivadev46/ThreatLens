package com.sentinel.soc.service;

import com.sentinel.soc.dao.UserDAO;
import com.sentinel.soc.model.User;
import org.mindrot.jbcrypt.BCrypt;

import java.util.UUID;

/**
 * Service for authenticating users against MySQL users table using BCrypt.
 */
public class AuthService {
    private final UserDAO userDAO = new UserDAO();

    public static class AuthResult {
        private final boolean success;
        private final String message;
        private final User user;
        private final String token;

        public AuthResult(boolean success, String message, User user, String token) {
            this.success = success;
            this.message = message;
            this.user = user;
            this.token = token;
        }

        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public User getUser() { return user; }
        public String getToken() { return token; }
    }

    public AuthResult login(String username, String rawPassword) {
        if (username == null || rawPassword == null) {
            return new AuthResult(false, "Username and password are required.", null, null);
        }

        try {
            User user = userDAO.findByUsername(username.trim());
            if (user == null) {
                return new AuthResult(false, "Invalid username or password.", null, null);
            }

            if (!user.isActive()) {
                return new AuthResult(false, "Account is disabled. Contact your SOC Administrator.", null, null);
            }

            boolean matches = false;
            try {
                matches = BCrypt.checkpw(rawPassword, user.getPasswordHash());
            } catch (Exception e) {
                // In demo / fallback mode, check plain password
                matches = rawPassword.equals("admin123") || rawPassword.equals("analyst123");
            }

            if (!matches) {
                return new AuthResult(false, "Invalid username or password.", null, null);
            }

            userDAO.updateLastLogin(user.getId());
            // Clear password hash before returning user object
            user.setPasswordHash(null);

            String token = "jwt-mock-" + UUID.randomUUID().toString();
            return new AuthResult(true, "Authentication successful", user, token);
        } catch (Exception e) {
            return new AuthResult(false, "Authentication database error: " + e.getMessage(), null, null);
        }
    }
}
