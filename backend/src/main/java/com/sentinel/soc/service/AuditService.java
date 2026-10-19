package com.sentinel.soc.service;

import com.sentinel.soc.dao.AuditLogDAO;
import com.sentinel.soc.model.AuditLogEntry;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service to manage tamper-evident, SHA-256 chained audit logs.
 */
public class AuditService {
    private final AuditLogDAO auditLogDAO = new AuditLogDAO();

    public AuditLogEntry recordEvent(String actor, String action, String category, String details, String ipAddress) {
        try {
            String prevHash = auditLogDAO.getLastEntryHash();
            LocalDateTime now = LocalDateTime.now();
            String id = "aud-" + UUID.randomUUID().toString();

            String payload = id + "|" + now.toString() + "|" + actor + "|" + action + "|" + details + "|" + prevHash;
            String entryHash = sha256(payload);

            AuditLogEntry entry = new AuditLogEntry();
            entry.setId(id);
            entry.setTimestamp(now);
            entry.setActor(actor);
            entry.setAction(action);
            entry.setCategory(category);
            entry.setDetails(details);
            entry.setIpAddress(ipAddress != null ? ipAddress : "127.0.0.1");
            entry.setPreviousHash(prevHash);
            entry.setEntryHash(entryHash);

            auditLogDAO.save(entry);
            return entry;
        } catch (Exception e) {
            System.err.println("Failed to record audit log: " + e.getMessage());
            return null;
        }
    }

    public static String sha256(String base) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new RuntimeException(ex);
        }
    }
}
