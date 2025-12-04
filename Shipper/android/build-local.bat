@echo off
REM Build script that uses a local Gradle cache inside the project folder to avoid filling C: drive.
REM Usage: run this from project root: "android\build-local.bat"

SETLOCAL
SET "PROJECT_ROOT=%~dp0..\"
REM Normalize path (remove trailing backslash)
SET "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

REM Use a .gradle_cache directory inside the project on the current drive (should be on D: in your setup)
SET "GRADLE_USER_HOME=%PROJECT_ROOT%\.gradle_cache"
IF NOT EXIST "%GRADLE_USER_HOME%" (
  mkdir "%GRADLE_USER_HOME%"
)











ENDLOCAL
n)
necho Build completed successfully.  ENDLOCAL & EXIT /B %ERRORLEVEL%  echo Check the output above for details.  echo Build failed with exit code %ERRORLEVEL%.
nIF %ERRORLEVEL% NEQ 0 (
n:: Run assemble/install using the local gradle cache
necho Building and installing app (this may take a while)...
nset "GRADLE_USER_HOME=%GRADLE_USER_HOME%"
ncall gradlew.bat app:installDebug -PreactNativeDevServerPort=8081 --no-daemon)  echo Clean failed, attempting to continue...
n:: Clean previous build artifacts to free space
necho Cleaning project build directories...
ncall gradlew.bat clean || (
n:: Stop any running Gradle daemons (uses android wrapper)
necho Stopping Gradle daemons...
ncd "%PROJECT_ROOT%\android"
ncall gradlew.bat --stop  || echo Gradle stop returned non-zero, continuing...necho Using GRADLE_USER_HOME=%GRADLE_USER_HOME%