# ThreatLens (Sentinel SOC) — Security Log Analyzer & Intrusion Detection System
> **Full-Stack OOPs & DBMS College Project**  
> Integrated **React + TypeScript Frontend** ⇄ **Java 17 REST API Backend** ⇄ **HikariCP JDBC** ⇄ **MySQL 8.0 Database**

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│              ThreatLens React 19 Frontend              │
│       Vite • TypeScript • TailwindCSS • Lucide         │
│          (Port 3000 / Deployed on Vercel)              │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON REST API (/api/v1/*)
                            ▼
┌────────────────────────────────────────────────────────┐
│            ThreatLens Java 17 Backend Engine           │
│           Lightweight HttpServer on Port 8080          │
│                                                        │
│  ├── Service Layer: LogParserService, RuleEngineService│
│  │                  AlertService, AuthService          │
│  ├── DAO Layer:     LogEntryDAO, AlertDAO, UserDAO     │
│  │                  DetectionRuleDAO, BlocklistDAO     │
│  └── Pool Manager:  HikariCP High-Performance JDBC     │
└───────────────────────────┬────────────────────────────┘
                            │ JDBC Connection Pool (TCP 3306)
                            ▼
┌────────────────────────────────────────────────────────┐
│               MySQL 8.0 Relational DBMS                │
│                 Database: sentinel_soc                 │
│                                                        │
│  ├── 9 Normalized Tables in Third Normal Form (3NF)    │
│  ├── B-Tree Composite Indexes for High-Velocity Logs   │
│  ├── Foreign Key Constraints & Cascading References    │
│  └── Tamper-Evident SHA-256 Chained Audit Trails       │
└────────────────────────────────────────────────────────┘
```

---

## 🎓 Academic Concepts Demonstrated

### 1. Object-Oriented Programming (OOP)
* **Encapsulation**: Models (`LogEntry`, `Alert`, `DetectionRule`, `BlocklistEntry`, `AuditLogEntry`, `User`) encapsulate private state with strongly typed getters/setters and domain validations.
* **Data Access Object (DAO) Pattern**: `LogEntryDAO`, `AlertDAO`, `UserDAO`, `BlocklistDAO`, `DetectionRuleDAO`, and `AuditLogDAO` abstract all low-level JDBC SQL queries away from service and controller layers.
* **Separation of Concerns**: Strict architectural separation between:
  1. Presentation Layer (React TSX components)
  2. Transport Layer (`apiClient.ts` & Java `HttpHandler` controllers)
  3. Domain Business Logic (`RuleEngineService`, `LogParserService`)
  4. Persistence Layer (JDBC HikariCP DAOs)
* **Polymorphism & Interfaces**: Standardized generic JSON responses (`ApiResponse<T>`), pluggable log source parsers, and HTTP REST abstractions.

### 2. Database Management System (DBMS)
* **3NF Relational Schema**: 9 distinct tables normalized to eliminate data redundancy:
  1. `users` — Operator profiles & BCrypt credential hashes
  2. `log_sources` — Registered web, firewall, and syslog nodes
  3. `log_entries` — High-volume ingestion table with raw payload and parsed facets
  4. `detection_rules` — Configurable sliding-window threshold heuristics
  5. `ip_blocklist` — Prohibited hostile network addresses with threat categorization
  6. `alerts` — Correlated security incidents linked to detection rules
  7. `alert_evidence` — Junction table associating specific logs to incident alerts
  8. `alert_notes` — Forensic investigator journals
  9. `audit_logs` — Immutable administrative event log
* **ACID Transactions**: Transactional integrity in `LogEntryDAO.saveBatch()` and `AlertDAO.save()` with explicit `conn.setAutoCommit(false)`, `conn.commit()`, and `conn.rollback()` on failure.
* **Indexing Strategy**: Composite B-Tree indexes `(source_ip, event_type, timestamp)` for high-velocity heuristic correlation within time windows.
* **Tamper-Evident Security**: Cryptographic SHA-256 blockchain-style hash linking in `audit_logs` where each record stores the previous record's hash.

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
* **Java 17+** (JDK 17 or higher)
* **Node.js 18+** & npm
* **MySQL 8.0** running on port 3306

---

### Step 1: Initialize MySQL Database
Run the setup script using MySQL CLI or MySQL Workbench:
```bash
# Option A: One-click batch file (Windows)
setup_db.bat

# Option B: Direct MySQL CLI command
mysql -u root -p < setup_database.sql
```
*This creates the `sentinel_soc` database, creates user `soc_app_user`, grants permissions, and populates initial detection rules and seed data.*

---

### Step 2: Start Java 17 Backend (Port 8080)
The repository includes a self-contained Maven Wrapper:
```bash
# Option A: One-click batch file
start_backend.bat

# Option B: Command Line
cd backend
mvnw.cmd compile exec:java
```
*The server will start and listen on `http://localhost:8080/api/v1`.*

Verify backend health:
```bash
curl http://localhost:8080/api/v1/health
```

---

### Step 3: Start React Frontend (Port 3000)
```bash
# Option A: One-click batch file
start_frontend.bat

# Option B: Command Line
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) in your web browser.*

Default Credentials:
* **Username**: `alex.chen`
* **Password**: `SentinelPass2026!` (or demo: `analyst123`)

---

## 🐳 Cross-Laptop Portability: Docker Compose

To run ThreatLens on another laptop with **zero manual MySQL installation**:
```bash
docker compose up -d
```
This automatically boots:
* A containerized MySQL 8.0 database initialized with `setup_database.sql`
* The compiled Java 17 backend connected via internal Docker networking

---

## 🌐 Note on Vercel Deployment

When your frontend is hosted on **Vercel**:
* Vercel delivers static web assets via a global CDN.
* Because Vercel runs in the cloud, code running in the browser cannot connect to `http://localhost:8080` unless the Java backend is also running on that specific user's computer or hosted on a public cloud URL (e.g., Render, Railway, AWS, or Cloud Run).
* In ThreatLens, the frontend includes an **intelligent fallback and configurable API URL**:
  1. In the dashboard, go to **Settings**.
  2. Set the **API Service Base URL** to your backend URL (defaulting to `http://localhost:8080/api/v1` for local development, or a public backend endpoint).
  3. If the backend is temporarily offline, the frontend operates gracefully using cached state.

---

## 📡 REST API Specification

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Probes server uptime and live MySQL database connectivity |
| `POST` | `/api/v1/auth/login` | Authenticates operator credentials via BCrypt hash verification |
| `GET` | `/api/v1/logs?limit=100` | Retrieves parsed security log entries from MySQL |
| `POST` | `/api/v1/logs` | Ingests raw logs, parses syntax, executes heuristic rules, and creates alerts |
| `DELETE` | `/api/v1/logs` | Purges security log entries (Admin action) |
| `GET` | `/api/v1/alerts` | Fetches correlated security alerts with status/severity filtering |
| `POST` | `/api/v1/alerts` | Manually triggers an incident alert |
| `PATCH` | `/api/v1/alerts` | Triages alert: updates status, appends forensic notes, blocks malicious IP |
| `DELETE` | `/api/v1/alerts?id=...` | Deletes an incident alert |
| `GET` | `/api/v1/rules` | Retrieves detection heuristics from MySQL |
| `POST` | `/api/v1/rules` | Creates a custom sliding-window correlation rule |
| `PATCH` | `/api/v1/rules` | Modifies rule thresholds, time windows, or enabled state |
| `DELETE` | `/api/v1/rules?id=...` | Removes a custom detection rule |
| `GET` | `/api/v1/blocklist` | Returns active prohibited network IPs |
| `POST` | `/api/v1/blocklist` | Adds an IP to the containment blocklist |
| `PATCH` | `/api/v1/blocklist` | Toggles IP blocklist status (ACTIVE / INACTIVE) |
| `DELETE` | `/api/v1/blocklist?id=...` | Removes an IP from the blocklist |
| `GET` | `/api/v1/audit-logs` | Retrieves tamper-evident cryptographic audit logs |
| `POST` | `/api/v1/audit-logs` | Appends a new SHA-256 chained audit record |
| `GET` | `/api/v1/users` | Lists authorized SOC operators |
| `POST` | `/api/v1/users` | Creates a new user with BCrypt password hashing |
| `GET` | `/api/v1/reports/summary` | Aggregates real-time metrics across all database tables |
