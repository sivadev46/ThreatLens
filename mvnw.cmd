@echo off
setlocal
call "%~dp0backend\mvnw.cmd" -f "%~dp0backend\pom.xml" %*
endlocal
