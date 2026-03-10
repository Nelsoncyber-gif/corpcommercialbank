@echo off
REM ============================================
REM CorpCommercial Bank - Database Setup Script
REM For Windows with PostgreSQL 16
REM ============================================

echo.
echo ========================================
echo  CORPCOMMERCIAL BANK - DATABASE SETUP
echo ========================================
echo.

REM Set PostgreSQL path
set PGPATH=C:\Program Files\PostgreSQL\16\bin
set PGUSER=postgres

echo Step 1: Checking PostgreSQL installation...
if exist "%PGPATH%\psql.exe" (
    echo [OK] PostgreSQL found at %PGPATH%
) else (
    echo [ERROR] PostgreSQL not found!
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo.
echo Step 2: Enter your PostgreSQL password for user 'postgres':
echo (This is the password you set during installation)
set /p PGPASSWORD="Password: "

echo.
echo Step 3: Testing database connection...
"%PGPATH%\psql.exe" -U postgres -c "SELECT version();" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not connect to PostgreSQL!
    echo Please check your password and try again.
    pause
    exit /b 1
)
echo [OK] Connection successful!

echo.
echo Step 4: Creating database 'corpcommercialbank'...
"%PGPATH%\createdb.exe" -U postgres corpcommercialbank 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Database may already exist (this is OK)
) else (
    echo [OK] Database created successfully!
)

echo.
echo Step 5: Running database migration...
node backend\scripts\migrate-add-columns.js
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DATABASE SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Update your .env file with the correct DATABASE_URL:
echo    DATABASE_URL=postgresql://postgres:%PGPASSWORD%@localhost:5432/corpcommercialbank
echo.
echo 2. Start the server: npm start
echo.
pause
