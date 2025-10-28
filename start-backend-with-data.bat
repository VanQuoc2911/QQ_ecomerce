@echo off
echo ========================================
echo    QQ ECOMMERCE BACKEND SETUP
echo ========================================
echo.

echo [1/4] Installing dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [2/4] Creating .env file...
echo # MongoDB Configuration > .env
echo MONGO_URI=mongodb://localhost:27017/qq_ecommerce >> .env
echo. >> .env
echo # JWT Secret >> .env
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production >> .env
echo. >> .env
echo # Server Configuration >> .env
echo PORT=4000 >> .env
echo ✅ .env file created

echo.
echo [3/4] Seeding database with real data...
call npm run seed
if %errorlevel% neq 0 (
    echo ❌ Failed to seed database
    echo Make sure MongoDB is running on localhost:27017
    pause
    exit /b 1
)
echo ✅ Database seeded successfully

echo.
echo [4/4] Starting backend server...
echo ✅ Backend server starting on http://localhost:4000
echo.
echo 📋 Available test accounts:
echo    Admin:   admin@qqecommerce.com   / admin123
echo    Seller:  seller@qqecommerce.com  / seller123
echo    Shipper: shipper@qqecommerce.com / shipper123
echo    System:  system@qqecommerce.com  / system123
echo    User:    user@qqecommerce.com    / user123
echo    User 2:  jane@qqecommerce.com   / user123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
call npm run dev
