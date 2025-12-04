@echo off
REM use-local-gradle.cmd
REM Usage: use-local-gradle.cmd C:\path\to\gradle-9.0.0-bin.zip
REM This script updates android/gradle/wrapper/gradle-wrapper.properties
REM to point the Gradle distribution URL at a local ZIP file so the
REM Gradle wrapper does not need to download from services.gradle.org.

if "%~1"=="" (
  echo Usage: %~nx0 C:\path\to\gradle-9.0.0-bin.zip
  exit /b 1
)

set ZIPPATH=%~1
if not exist "%ZIPPATH%" (
  echo File not found: "%ZIPPATH%"
  exit /b 2
)

REM Build a file URL form acceptable to gradle-wrapper.properties
REM Convert backslashes to forward slashes and ensure drive letter is preserved
setlocal enabledelayedexpansion
set "P=%ZIPPATH%"
set "P=!P:\=/!"

REM If path begins with a drive letter like C:/..., prefix with file:/
REM The resulting URL will look like: file:/C:/path/gradle-9.0.0-bin.zip
set "FILEURL=file:/!P!"

REM Path to the wrapper properties file (relative to repo)
set "WRAPPER=%~dp0..\android\gradle\wrapper\gradle-wrapper.properties"
REM Normalize path
for %%I in ("%WRAPPER%") do set WRAPPER=%%~fI

if not exist "%WRAPPER%" (
  echo gradle-wrapper.properties not found at "%WRAPPER%"
  exit /b 3
)

echo Updating distributionUrl in "%WRAPPER%" to "%FILEURL%"

REM Use PowerShell one-liner to replace the distributionUrl line
powershell -NoProfile -Command "(Get-Content -Raw -LiteralPath '%WRAPPER%') -replace '(?m)^distributionUrl=.*$','distributionUrl=%FILEURL%' | Set-Content -LiteralPath '%WRAPPER%'"

if %ERRORLEVEL% neq 0 (
  echo Failed to update %WRAPPER%
  exit /b 4
)

echo Done. You can now run: pushd .. & npx react-native run-android
endlocal
