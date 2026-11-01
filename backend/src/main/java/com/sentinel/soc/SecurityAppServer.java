package com.sentinel.soc;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sentinel.soc.config.DatabaseConfig;
import com.sentinel.soc.dao.*;
import com.sentinel.soc.model.*;
import com.sentinel.soc.service.*;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Lightweight, zero-external-framework Java 17 HTTP REST API Server
 * using built-in com.sun.net.httpserver.HttpServer and Jackson JSON serialization.
 */
public class SecurityAppServer {
    private static final Logger LOGGER = Logger.getLogger(SecurityAppServer.class.getName());
    public static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final Instant START_TIME = Instant.now();

    private final int port;
    private HttpServer server;

    private static final LogParserService logParserService = new LogParserService();
    private static final RuleEngineService ruleEngineService = new RuleEngineService();
    private static final AlertService alertService = new AlertService();
    private static final AuthService authService = new AuthService();
    private static final AuditService auditService = new AuditService();

    private static final LogEntryDAO logEntryDAO = new LogEntryDAO();
    private static final AlertDAO alertDAO = new AlertDAO();
    private static final BlocklistDAO blocklistDAO = new BlocklistDAO();
    private static final DetectionRuleDAO detectionRuleDAO = new DetectionRuleDAO();
    private static final AuditLogDAO auditLogDAO = new AuditLogDAO();
    private static final UserDAO userDAO = new UserDAO();

    public SecurityAppServer(int port) {
        this.port = port;
    }

    public static void main(String[] args) {
        int port = 8080;
        String envPort = System.getenv("PORT");
        if (envPort == null) envPort = System.getenv("SERVER_PORT");
        if (envPort != null) {
            try {
                port = Integer.parseInt(envPort.trim());
            } catch (NumberFormatException ignored) {}
        } else {
            Properties props = loadProperties();
            if (props.containsKey("server.port")) {
                try {
                    port = Integer.parseInt(props.getProperty("server.port").trim());
                } catch (NumberFormatException ignored) {}
            }
        }

        SecurityAppServer app = new SecurityAppServer(port);
        try {
            app.start();
            LOGGER.info("Sentinel SOC Java REST API listening on http://localhost:" + port + "/api/v1");
        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, "Failed to start Java HTTP server on port " + port, e);
            System.exit(1);
        }
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        // Core Health & Diagnostic Route
        server.createContext("/api/v1/health", new HealthHandler());

        // Security REST Routes
        server.createContext("/api/v1/logs", new LogsHandler());
        server.createContext("/api/v1/alerts", new AlertsHandler());
        server.createContext("/api/v1/rules", new RulesHandler());
        server.createContext("/api/v1/blocklist", new BlocklistHandler());
        server.createContext("/api/v1/audit-logs", new AuditLogsHandler());
        server.createContext("/api/v1/users", new UsersHandler());
        server.createContext("/api/v1/reports/summary", new ReportsSummaryHandler());
        server.createContext("/api/v1/auth/login", new AuthLoginHandler());

        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
    }

    public void stop() {
        if (server != null) {
            server.stop(1);
        }
    }

    private static Properties loadProperties() {
        Properties props = new Properties();
        try (InputStream in = SecurityAppServer.class.getResourceAsStream("/application.properties")) {
            if (in != null) props.load(in);
        } catch (Exception e) {
            LOGGER.warning("Could not read application.properties, using defaults.");
        }
        return props;
    }

    public static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    }

    public static void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        addCorsHeaders(exchange);
        Map<String, Object> response = new HashMap<>();
        response.put("success", statusCode >= 200 && statusCode < 300);
        response.put("data", data);
        response.put("timestamp", Instant.now().toString());

        byte[] jsonBytes = OBJECT_MAPPER.writeValueAsString(response).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, jsonBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(jsonBytes);
        }
    }

    public static void sendErrorResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        addCorsHeaders(exchange);
        Map<String, Object> err = new HashMap<>();
        err.put("success", false);
        err.put("error", message);
        err.put("timestamp", Instant.now().toString());

        byte[] json = OBJECT_MAPPER.writeValueAsString(err).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, json.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(json);
        }
    }

    public static String readRequestBody(HttpExchange exchange) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString().trim();
        }
    }

    // Handlers
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            long uptime = Instant.now().getEpochSecond() - START_TIME.getEpochSecond();
            boolean isDbUp = DatabaseConfig.isHealthy();
            String overallStatus = isDbUp ? "UP" : "DEGRADED";

            Map<String, Object> data = new HashMap<>();
            data.put("status", overallStatus);
            data.put("overallStatus", overallStatus);
            data.put("javaStatus", "UP");
            data.put("databaseStatus", isDbUp ? "CONNECTED" : "DISCONNECTED");
            data.put("database", isDbUp ? "CONNECTED" : "DISCONNECTED");
            data.put("version", "1.0.0-Java17");
            data.put("uptimeSeconds", uptime);
            data.put("service", "Sentinel SOC Security Log Analyzer & IDS");
            data.put("message", isDbUp ? "Java 17 REST Service Operational & MySQL Database Connected" : "Java 17 REST Service Operational (MySQL Database Disconnected)");
            data.put("timestamp", Instant.now().toString());

            // Provide top-level fields AND data field so any consumer receives both
            Map<String, Object> response = new HashMap<>(data);
            response.put("success", true);
            response.put("data", data);

            byte[] jsonBytes = OBJECT_MAPPER.writeValueAsString(response).getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(200, jsonBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(jsonBytes);
            }
        }
    }

    static class LogsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    int limit = 100;
                    int offset = 0;
                    if (query != null) {
                        for (String param : query.split("&")) {
                            String[] pair = param.split("=");
                            if (pair.length == 2) {
                                if ("limit".equalsIgnoreCase(pair[0])) limit = Integer.parseInt(pair[1]);
                                if ("offset".equalsIgnoreCase(pair[0])) offset = Integer.parseInt(pair[1]);
                            }
                        }
                    }
                    List<LogEntry> logs = logEntryDAO.findAll(limit, offset);
                    sendJsonResponse(exchange, 200, logs);
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    List<LogEntry> parsedEntries = new ArrayList<>();
                    List<String> errors = new ArrayList<>();

                    String[] lines = body.split("\n");
                    for (int i = 0; i < lines.length; i++) {
                        LogParserService.ParseResult result = logParserService.parseLine(lines[i], i + 1, "upload.log");
                        if (result.isSuccess()) {
                            parsedEntries.add(result.getEntry());
                        } else if (result.getError() != null) {
                            errors.add(result.getError());
                        }
                    }

                    if (!parsedEntries.isEmpty()) {
                        logEntryDAO.saveBatch(parsedEntries);
                        List<DetectionRule> rules = detectionRuleDAO.findAll();
                        Set<String> blockedIps = blocklistDAO.getActiveBlockedIps();
                        List<Alert> triggered = ruleEngineService.evaluateLogs(parsedEntries, rules, blockedIps);
                        for (Alert a : triggered) {
                            alertDAO.save(a);
                        }
                        auditService.recordEvent(
                            "SOC Analyst",
                            "LOG_INGESTION",
                            "LOG_IMPORT",
                            "Ingested " + parsedEntries.size() + " logs; triggered " + triggered.size() + " security alerts.",
                            "127.0.0.1"
                        );
                    }

                    Map<String, Object> resp = new HashMap<>();
                    resp.put("ingestedCount", parsedEntries.size());
                    resp.put("errorCount", errors.size());
                    resp.put("errors", errors);
                    sendJsonResponse(exchange, 201, resp);
                } else if ("DELETE".equals(method)) {
                    logEntryDAO.deleteAll();
                    auditService.recordEvent("SOC Analyst", "LOG_CLEAR", "SYSTEM", "Purged security log entries.", "127.0.0.1");
                    sendJsonResponse(exchange, 200, Collections.singletonMap("deleted", true));
                } else {
                    sendErrorResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Error processing logs: " + e.getMessage());
            }
        }
    }

    static class AlertsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    String status = null;
                    String severity = null;
                    int limit = 100;
                    if (query != null) {
                        for (String param : query.split("&")) {
                            String[] pair = param.split("=");
                            if (pair.length == 2) {
                                if ("status".equalsIgnoreCase(pair[0])) status = pair[1];
                                if ("severity".equalsIgnoreCase(pair[0])) severity = pair[1];
                                if ("limit".equalsIgnoreCase(pair[0])) limit = Integer.parseInt(pair[1]);
                            }
                        }
                    }
                    List<Alert> alerts = alertDAO.findAll(status, severity, limit);
                    sendJsonResponse(exchange, 200, alerts);
                } else if ("PATCH".equals(method)) {
                    String body = readRequestBody(exchange);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> payload = OBJECT_MAPPER.readValue(body, Map.class);
                    String alertId = (String) payload.getOrDefault("alertId", payload.get("id"));
                    String action = (String) payload.get("action");
                    if (action == null && payload.containsKey("status")) {
                        action = "UPDATE_STATUS";
                    }

                    if ("UPDATE_STATUS".equals(action)) {
                        String newStatus = (String) payload.get("status");
                        String reason = (String) payload.getOrDefault("reason", "Status updated by analyst");
                        String actor = (String) payload.getOrDefault("actor", payload.getOrDefault("assignedTo", "SOC Analyst"));
                        boolean ok = alertService.updateStatus(alertId, newStatus, reason, actor);
                        sendJsonResponse(exchange, 200, Collections.singletonMap("updated", ok));
                    } else if ("ADD_NOTE".equals(action)) {
                        String note = (String) payload.get("note");
                        String author = (String) payload.getOrDefault("author", "SOC Analyst");
                        alertService.addNote(alertId, author, note);
                        sendJsonResponse(exchange, 200, Collections.singletonMap("saved", true));
                    } else if ("BLOCK_IP".equals(action)) {
                        String ip = (String) payload.get("ip");
                        String reason = (String) payload.get("reason");
                        String actor = (String) payload.getOrDefault("actor", "SOC Analyst");
                        boolean ok = alertService.blockIpFromAlert(alertId, ip, reason, actor);
                        sendJsonResponse(exchange, 200, Collections.singletonMap("blocked", ok));
                    } else {
                        sendErrorResponse(exchange, 400, "Unknown action: " + action);
                    }
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    Alert alert = OBJECT_MAPPER.readValue(body, Alert.class);
                    if (alert.getId() == null) alert.setId("alt-" + UUID.randomUUID().toString());
                    if (alert.getTimestamp() == null) alert.setTimestamp(LocalDateTime.now());
                    alertDAO.save(alert);
                    sendJsonResponse(exchange, 201, alert);
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    String id = query != null && query.startsWith("id=") ? query.substring(3) : null;
                    if (id != null) {
                        boolean ok = alertDAO.delete(id);
                        sendJsonResponse(exchange, 200, Collections.singletonMap("deleted", ok));
                    } else {
                        alertDAO.deleteAll();
                        sendJsonResponse(exchange, 200, Collections.singletonMap("deletedAll", true));
                    }
                } else {
                    sendErrorResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Alert processing failed: " + e.getMessage());
            }
        }
    }

    static class RulesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    List<DetectionRule> rules = detectionRuleDAO.findAll();
                    sendJsonResponse(exchange, 200, rules);
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    DetectionRule rule = OBJECT_MAPPER.readValue(body, DetectionRule.class);
                    if (rule.getId() == null) rule.setId("rule-" + UUID.randomUUID().toString().substring(0, 8));
                    detectionRuleDAO.save(rule);
                    auditService.recordEvent("SOC Admin", "CREATE_RULE", "RULE_CONFIG", "Created detection rule " + rule.getCode(), "127.0.0.1");
                    sendJsonResponse(exchange, 201, rule);
                } else if ("PATCH".equals(method)) {
                    String body = readRequestBody(exchange);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> payload = OBJECT_MAPPER.readValue(body, Map.class);
                    String id = (String) payload.get("id");
                    boolean enabled = (Boolean) payload.get("enabled");
                    int window = ((Number) payload.get("timeWindowSeconds")).intValue();
                    int threshold = ((Number) payload.get("thresholdValue")).intValue();
                    String severity = (String) payload.get("severity");

                    boolean ok = detectionRuleDAO.updateRule(id, enabled, window, threshold, severity);
                    auditService.recordEvent("SOC Analyst", "UPDATE_RULE", "RULE_CONFIG", "Updated rule " + id + " (enabled=" + enabled + ")", "127.0.0.1");
                    sendJsonResponse(exchange, 200, Collections.singletonMap("updated", ok));
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    String id = query != null && query.startsWith("id=") ? query.substring(3) : null;
                    if (id != null) {
                        boolean ok = detectionRuleDAO.delete(id);
                        auditService.recordEvent("SOC Admin", "DELETE_RULE", "RULE_CONFIG", "Deleted detection rule " + id, "127.0.0.1");
                        sendJsonResponse(exchange, 200, Collections.singletonMap("deleted", ok));
                    } else {
                        sendErrorResponse(exchange, 400, "Missing id parameter");
                    }
                } else {
                    sendErrorResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Rules error: " + e.getMessage());
            }
        }
    }

    static class BlocklistHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    List<BlocklistEntry> list = blocklistDAO.findAll();
                    sendJsonResponse(exchange, 200, list);
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    BlocklistEntry entry = OBJECT_MAPPER.readValue(body, BlocklistEntry.class);
                    if (entry.getId() == null) entry.setId("blk-" + UUID.randomUUID().toString().substring(0, 8));
                    if (entry.getIpAddress() == null && entry.getIp() != null) entry.setIpAddress(entry.getIp());
                    if (entry.getStatus() == null) entry.setStatus("ACTIVE");
                    if (entry.getThreatCategory() == null) entry.setThreatCategory("Hostile Attack Origin");
                    if (entry.getAddedAt() == null) entry.setAddedAt(LocalDateTime.now());
                    blocklistDAO.save(entry);
                    auditService.recordEvent(
                        entry.getAddedBy() != null ? entry.getAddedBy() : "SOC Analyst",
                        "ADD_BLOCKLIST_IP",
                        "BLOCKLIST",
                        "Added " + entry.getIpAddress() + " to blocklist (" + entry.getReason() + ")",
                        "127.0.0.1"
                    );
                    sendJsonResponse(exchange, 201, entry);
                } else if ("PATCH".equals(method)) {
                    String body = readRequestBody(exchange);
                    @SuppressWarnings("unchecked")
                    Map<String, String> payload = OBJECT_MAPPER.readValue(body, Map.class);
                    String id = payload.get("id");
                    String status = payload.get("status");
                    boolean ok = blocklistDAO.updateStatus(id, status);
                    sendJsonResponse(exchange, 200, Collections.singletonMap("updated", ok));
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    String id = query != null && query.startsWith("id=") ? query.substring(3) : null;
                    if (id != null) {
                        boolean ok = blocklistDAO.delete(id);
                        auditService.recordEvent("SOC Analyst", "REMOVE_BLOCKLIST_IP", "BLOCKLIST", "Removed IP id " + id + " from blocklist", "127.0.0.1");
                        sendJsonResponse(exchange, 200, Collections.singletonMap("deleted", ok));
                    } else {
                        sendErrorResponse(exchange, 400, "Missing id parameter");
                    }
                } else {
                    sendErrorResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Blocklist error: " + e.getMessage());
            }
        }
    }

    static class AuditLogsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    List<AuditLogEntry> logs = auditLogDAO.findAll(100);
                    sendJsonResponse(exchange, 200, logs);
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    AuditLogEntry entry = OBJECT_MAPPER.readValue(body, AuditLogEntry.class);
                    AuditLogEntry recorded = auditService.recordEvent(
                        entry.getActor() != null ? entry.getActor() : "System",
                        entry.getAction() != null ? entry.getAction() : "ACTION",
                        entry.getCategory() != null ? entry.getCategory() : "SYSTEM",
                        entry.getDetails() != null ? entry.getDetails() : "",
                        entry.getIpAddress() != null ? entry.getIpAddress() : "127.0.0.1"
                    );
                    sendJsonResponse(exchange, 201, recorded != null ? recorded : entry);
                } else {
                    sendErrorResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Audit logs error: " + e.getMessage());
            }
        }
    }

    static class UsersHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    List<User> users = userDAO.findAll();
                    for (User u : users) {
                        u.setPasswordHash(null);
                    }
                    sendJsonResponse(exchange, 200, users);
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    User user = OBJECT_MAPPER.readValue(body, User.class);
                    if (user.getId() == null) user.setId("usr-" + UUID.randomUUID().toString().substring(0, 8));
                    if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
                        user.setPasswordHash(org.mindrot.jbcrypt.BCrypt.hashpw("SentinelPass2026!", org.mindrot.jbcrypt.BCrypt.gensalt(12)));
                    } else if (!user.getPasswordHash().startsWith("$2a$")) {
                        user.setPasswordHash(org.mindrot.jbcrypt.BCrypt.hashpw(user.getPasswordHash(), org.mindrot.jbcrypt.BCrypt.gensalt(12)));
                    }
                    userDAO.save(user);
                    user.setPasswordHash(null);
                    auditService.recordEvent("SOC Admin", "CREATE_USER", "AUTH", "Created operator user " + user.getUsername(), "127.0.0.1");
                    sendJsonResponse(exchange, 201, user);
                } else if ("PATCH".equals(method)) {
                    String body = readRequestBody(exchange);
                    User user = OBJECT_MAPPER.readValue(body, User.class);
                    boolean ok = userDAO.update(user);
                    sendJsonResponse(exchange, 200, Collections.singletonMap("updated", ok));
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    String id = query != null && query.startsWith("id=") ? query.substring(3) : null;
                    if (id != null) {
                        boolean ok = userDAO.delete(id);
                        auditService.recordEvent("SOC Admin", "DELETE_USER", "AUTH", "Deleted user " + id, "127.0.0.1");
                        sendJsonResponse(exchange, 200, Collections.singletonMap("deleted", ok));
                    } else {
                        sendErrorResponse(exchange, 400, "Missing id parameter");
                    }
                } else {
                    sendErrorResponse(exchange, 405, "Method Not Allowed");
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Users error: " + e.getMessage());
            }
        }
    }

    static class ReportsSummaryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                List<Alert> alerts = alertDAO.findAll(null, null, 1000);
                Set<String> blocked = blocklistDAO.getActiveBlockedIps();
                long totalLogs = logEntryDAO.countAll();
                List<DetectionRule> rules = detectionRuleDAO.findAll();

                long openAlerts = alerts.stream().filter(a -> "OPEN".equalsIgnoreCase(a.getStatus())).count();
                long investigatingAlerts = alerts.stream().filter(a -> "INVESTIGATING".equalsIgnoreCase(a.getStatus())).count();
                long resolvedAlerts = alerts.stream().filter(a -> "RESOLVED".equalsIgnoreCase(a.getStatus())).count();

                long criticalCount = alerts.stream().filter(a -> "CRITICAL".equalsIgnoreCase(a.getSeverity())).count();
                long highCount = alerts.stream().filter(a -> "HIGH".equalsIgnoreCase(a.getSeverity())).count();
                long mediumCount = alerts.stream().filter(a -> "MEDIUM".equalsIgnoreCase(a.getSeverity())).count();
                long lowCount = alerts.stream().filter(a -> "LOW".equalsIgnoreCase(a.getSeverity())).count();

                Map<String, Object> metrics = new HashMap<>();
                metrics.put("totalLogs", totalLogs);
                metrics.put("totalAlerts", alerts.size());
                metrics.put("openAlerts", openAlerts);
                metrics.put("investigatingAlerts", investigatingAlerts);
                metrics.put("resolvedAlerts", resolvedAlerts);
                metrics.put("criticalAlerts", criticalCount);
                metrics.put("highAlerts", highCount);
                metrics.put("mediumAlerts", mediumCount);
                metrics.put("lowAlerts", lowCount);
                metrics.put("activeBlockedIps", blocked.size());
                metrics.put("activeRulesCount", rules.stream().filter(DetectionRule::isEnabled).count());
                metrics.put("totalRulesCount", rules.size());
                metrics.put("systemHealthScore", openAlerts > 10 ? 82 : (openAlerts > 0 ? 94 : 99));

                sendJsonResponse(exchange, 200, metrics);
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Metrics error: " + e.getMessage());
            }
        }
    }

    static class AuthLoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Method Not Allowed. Use POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                @SuppressWarnings("unchecked")
                Map<String, String> creds = OBJECT_MAPPER.readValue(body, Map.class);
                String username = creds.get("username");
                String password = creds.get("password");

                AuthService.AuthResult result = authService.login(username, password);
                if (result.isSuccess()) {
                    Map<String, Object> data = new HashMap<>();
                    data.put("user", result.getUser());
                    data.put("token", result.getToken());
                    sendJsonResponse(exchange, 200, data);
                } else {
                    sendErrorResponse(exchange, 401, result.getMessage());
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Login error: " + e.getMessage());
            }
        }
    }
}
