package com.sentinel.soc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
    public static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());
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

    public SecurityAppServer(int port) {
        this.port = port;
    }

    public static void main(String[] args) {
        int port = 8080;
        Properties props = loadProperties();
        if (props.containsKey("server.port")) {
            try {
                port = Integer.parseInt(props.getProperty("server.port").trim());
            } catch (NumberFormatException ignored) {}
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
            Map<String, Object> data = new HashMap<>();
            data.put("status", "UP");
            data.put("version", "1.0.0-Java17");
            data.put("database", "CONNECTED");
            data.put("uptimeSeconds", uptime);
            data.put("service", "Sentinel SOC Security Log Analyzer & IDS");
            data.put("timestamp", Instant.now().toString());
            sendJsonResponse(exchange, 200, data);
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
                    List<LogEntry> logs = logEntryDAO.findAll(100, 0);
                    sendJsonResponse(exchange, 200, logs);
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    List<LogEntry> parsedEntries = new ArrayList<>();
                    List<String> errors = new ArrayList<>();

                    // Parse line by line
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
                        // Trigger detection correlation against rules & blocklist
                        List<DetectionRule> rules = detectionRuleDAO.findAll();
                        Set<String> blockedIps = blocklistDAO.getActiveBlockedIps();
                        List<Alert> triggered = ruleEngineService.evaluateLogs(parsedEntries, rules, blockedIps);
                        for (Alert a : triggered) {
                            alertDAO.save(a);
                        }
                    }

                    Map<String, Object> resp = new HashMap<>();
                    resp.put("ingestedCount", parsedEntries.size());
                    resp.put("errorCount", errors.size());
                    resp.put("errors", errors);
                    sendJsonResponse(exchange, 201, resp);
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

            String path = exchange.getRequestURI().getPath();
            try {
                if ("GET".equals(method)) {
                    List<Alert> alerts = alertDAO.findAll(null, null, 100);
                    sendJsonResponse(exchange, 200, alerts);
                } else if ("PATCH".equals(method) || "POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> payload = OBJECT_MAPPER.readValue(body, Map.class);
                    String alertId = (String) payload.get("alertId");
                    String action = (String) payload.get("action");

                    if ("UPDATE_STATUS".equals(action)) {
                        String newStatus = (String) payload.get("status");
                        String reason = (String) payload.get("reason");
                        String actor = (String) payload.getOrDefault("actor", "SOC Analyst");
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
                    sendJsonResponse(exchange, 200, Collections.singletonMap("updated", ok));
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
                    if (entry.getId() == null) entry.setId("blk-" + UUID.randomUUID().toString());
                    if (entry.getAddedAt() == null) entry.setAddedAt(LocalDateTime.now());
                    blocklistDAO.save(entry);
                    sendJsonResponse(exchange, 201, entry);
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    String id = query != null && query.startsWith("id=") ? query.substring(3) : null;
                    if (id != null) {
                        boolean ok = blocklistDAO.delete(id);
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
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                List<AuditLogEntry> logs = auditLogDAO.findAll(100);
                sendJsonResponse(exchange, 200, logs);
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Audit logs error: " + e.getMessage());
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

                long openAlerts = alerts.stream().filter(a -> "OPEN".equalsIgnoreCase(a.getStatus())).count();
                long investigatingAlerts = alerts.stream().filter(a -> "INVESTIGATING".equalsIgnoreCase(a.getStatus())).count();
                long resolvedAlerts = alerts.stream().filter(a -> "RESOLVED".equalsIgnoreCase(a.getStatus())).count();

                Map<String, Object> metrics = new HashMap<>();
                metrics.put("totalAlerts", alerts.size());
                metrics.put("openAlerts", openAlerts);
                metrics.put("investigatingAlerts", investigatingAlerts);
                metrics.put("resolvedAlerts", resolvedAlerts);
                metrics.put("activeBlockedIps", blocked.size());
                metrics.put("systemHealthScore", 98);

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
