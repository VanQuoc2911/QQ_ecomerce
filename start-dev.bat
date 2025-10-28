@echo off
echo 🚀 Starting QQ E-commerce Development Environment...

echo.
echo 📦 Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo 🎨 Starting Frontend Server...
start "Frontend Server" cmd /k "cd web && npm run dev"

echo.
echo ✅ Both servers are starting...
echo 📡 Backend: http://localhost:4000
echo 🎨 Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul
