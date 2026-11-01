@echo off
echo ============================================================
echo Starting ThreatLens Java 17 Backend on Port 8080...
echo ============================================================
cd "%~dp0backend"
call mvnw.cmd compile exec:java
pause
