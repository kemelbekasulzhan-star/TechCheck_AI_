@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" (
  "runtime\node.exe" scripts\launch.mjs --demo
) else (
  node scripts\launch.mjs --demo
)
if errorlevel 1 pause
