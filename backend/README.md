# Sentinel SOC Security Log Analyzer & Intrusion Detection System — Java 17 Backend

This is the lightweight Java 17 REST API backend for the **Security Log Analyzer & Intrusion Detection Dashboard**.

## Architecture Overview

```
Frontend (React/Vite on Port 3000)
    │  HTTP JSON REST API (/api/v1/*)
    ▼
Java 17 HttpServer (com.sun.net.httpserver on Port 8080)
    │
    ├── Service Layer (LogParserService, RuleEngineService, AlertService, AuthService)
    │
    ├── DAO / Repository Layer (LogEntryDAO, AlertDAO, BlocklistDAO, UserDAO, AuditDAO)
    │
    ├── Connection Pool (HikariCP)
    │
    ▼
MySQL 8.0 Relational Database (jdbc:mysql://localhost:3306/sentinel_soc)
```

## Prerequisites

1. **Java Development Kit (JDK) 17+**: Ensure `java -version` returns Java 17.
2. **Apache Maven 3.8+**: Ensure `mvn -version` is available on your PATH.
3. **MySQL Server 8.0**: Running locally on port `3306`.

## Database Setup

1. Open MySQL Command Line or MySQL Workbench:
```sql
SOURCE backend/src/main/resources/schema.sql;
```
2. Verify that database `sentinel_soc` and all 9 normalized tables have been created:
   - `users`
   - `log_sources`
   - `log_entries`
   - `detection_rules`
   - `ip_blocklist`
   - `alerts`
   - `alert_evidence`
   - `alert_notes`
   - `audit_logs`

## Building and Running the Backend

From the project root:

```bash
# Change to backend directory
cd backend

# Compile and run JUnit 5 tests
mvn clean test

# Run the REST API Server on port 8080
mvn compile exec:java
```

Once running, verify health at:
```bash
curl http://localhost:8080/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "version": "1.0.0-Java17",
    "database": "CONNECTED",
    "service": "Sentinel SOC Security Log Analyzer & IDS"
  }
}
```

## Connecting with the React Frontend

1. Ensure the React Vite app is running (`npm run dev`) on `http://localhost:3000`.
2. In the web dashboard, open **Settings**.
3. Under **Java 17 REST API Service Adapter**, verify the URL is set to `http://localhost:8080/api/v1`.
4. Click **Probe API Health**. The indicator will turn green (`LIVE JAVA REST`).
