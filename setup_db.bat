@echo off
echo ============================================================
echo Sentinel SOC ThreatLens - MySQL Database Setup
echo ============================================================
echo Please enter your MySQL root password when prompted:
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < "%~dp0setup_database.sql"
if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Database sentinel_soc and user soc_app_user created!
    echo ============================================================
) else (
    echo.
    echo [ERROR] Database setup failed. Please verify your root password.
)
pause
