package com.sentinel.soc.service;

import com.sentinel.soc.model.LogEntry;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for parsing and validating log lines conforming to:
 * YYYY-MM-DD HH:MM:SS | IP_ADDRESS | USERNAME | EVENT_TYPE | ENDPOINT
 */
public class LogParserService {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern IPV4_PATTERN = Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$");

    public static class ParseResult {
        private final LogEntry entry;
        private final String error;

        public ParseResult(LogEntry entry, String error) {
            this.entry = entry;
            this.error = error;
        }

        public boolean isSuccess() { return entry != null; }
        public LogEntry getEntry() { return entry; }
        public String getError() { return error; }
    }

    public ParseResult parseLine(String rawLine, int lineNumber, String sourceName) {
        if (rawLine == null || rawLine.trim().isEmpty() || rawLine.trim().startsWith("#")) {
            return new ParseResult(null, null);
        }

        String trimmed = rawLine.trim();
        String[] parts = trimmed.split("\\|");
        if (parts.length < 5) {
            return new ParseResult(null, "Line " + lineNumber + ": Expected 5 pipe-delimited fields, found " + parts.length);
        }

        String timestampStr = parts[0].trim();
        String ipStr = parts[1].trim();
        String username = parts[2].trim();
        String eventType = parts[3].trim().toUpperCase();
        String endpoint = parts[4].trim();

        // 1. Validate Timestamp
        LocalDateTime timestamp;
        try {
            timestamp = LocalDateTime.parse(timestampStr, DATE_FORMATTER);
        } catch (Exception e) {
            return new ParseResult(null, "Line " + lineNumber + ": Invalid timestamp format '" + timestampStr + "'. Expected YYYY-MM-DD HH:MM:SS.");
        }

        // 2. Validate IPv4
        if (!isValidIpv4(ipStr)) {
            return new ParseResult(null, "Line " + lineNumber + ": Invalid IPv4 address '" + ipStr + "'.");
        }

        // 3. Validate EventType
        if (!isValidEventType(eventType)) {
            return new ParseResult(null, "Line " + lineNumber + ": Unknown event type '" + eventType + "'. Must be LOGIN_SUCCESS, LOGIN_FAILED, HTTP_REQUEST, or LOGOUT.");
        }

        int statusCode = "LOGIN_FAILED".equals(eventType) ? 401 : 200;

        LogEntry entry = new LogEntry();
        entry.setId("log-" + UUID.randomUUID().toString());
        entry.setTimestamp(timestamp);
        entry.setSourceIp(ipStr);
        entry.setUsername(username);
        entry.setEventType(eventType);
        entry.setEndpoint(endpoint);
        entry.setStatusCode(statusCode);
        entry.setRawLine(trimmed);
        entry.setLogSource(sourceName != null ? sourceName : "syslog.log");

        return new ParseResult(entry, null);
    }

    public static boolean isValidIpv4(String ip) {
        if (ip == null) return false;
        Matcher m = IPV4_PATTERN.matcher(ip.trim());
        if (!m.matches()) return false;
        for (int i = 1; i <= 4; i++) {
            int octet = Integer.parseInt(m.group(i));
            if (octet < 0 || octet > 255) return false;
        }
        return true;
    }

    public static boolean isValidEventType(String eventType) {
        return "LOGIN_SUCCESS".equals(eventType) ||
               "LOGIN_FAILED".equals(eventType) ||
               "HTTP_REQUEST".equals(eventType) ||
               "LOGOUT".equals(eventType);
    }
}
