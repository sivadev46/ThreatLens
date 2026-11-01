@echo off
setlocal
set "DIR=%~dp0"
set "MAVEN_DIR=%DIR%.mvn\apache-maven\apache-maven-3.9.6"

if not exist "%MAVEN_DIR%\bin\mvn.cmd" (
    where mvn >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [INFO] Apache Maven not detected. Downloading portable Maven 3.9.6...
        if not exist "%DIR%.mvn" mkdir "%DIR%.mvn"
        powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object Net.WebClient; $wc.DownloadFile('https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip', '%DIR%.mvn\maven.zip'); Expand-Archive -Path '%DIR%.mvn\maven.zip' -DestinationPath '%DIR%.mvn\apache-maven' -Force; Remove-Item '%DIR%.mvn\maven.zip' -Force"
    )
)

if exist "%MAVEN_DIR%\bin\mvn.cmd" (
    call "%MAVEN_DIR%\bin\mvn.cmd" %*
) else (
    mvn %*
)
endlocal
