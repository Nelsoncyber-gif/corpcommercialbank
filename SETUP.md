# 🏦 CorpCommercial Bank - Setup Guide

## Quick Start (Windows)

### Step 1: Update Database Password

Open `.env` and replace `your-postgres-password` with your actual PostgreSQL password:

```env
DATABASE_URL=postgresql://postgres:YOUR-ACTUAL-PASSWORD@localhost:5432/corpcommercialbank
```

**Don't know your PostgreSQL password?**
- It's the password you set during PostgreSQL installation
- If you forgot it, see "Reset PostgreSQL Password" below

### Step 2: Run Database Setup

Option A - Automatic (Recommended):
```bash
.\setup-database.bat
```

Option B - Manual:
```bash
# Create database
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres corpcommercialbank

# Run migration
npm run migrate:user-columns
```

### Step 3: Start the Server

```bash
npm start
```

The server should start on http://localhost:5000

---

## Troubleshooting

### "Transaction PIN not working"

1. **Check database connection**: Make sure your PostgreSQL password is correct in `.env`

2. **Verify transaction_pin column exists**:
   ```bash
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d corpcommercialbank -c "\d users"
   ```
   Look for `transaction_pin` in the list.

3. **Re-run migration**:
   ```bash
   npm run migrate:user-columns
   ```

4. **Check server logs** when setting PIN:
   - Look for: `🔵 Set PIN endpoint called for user: X`
   - Look for: `✅ PIN set successfully`

### "Database connection error"

1. **Check if PostgreSQL is running**:
   ```bash
   # In PowerShell
   Get-Service -Name postgresql*
   ```
   Status should be "Running"

2. **Test connection**:
   ```bash
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -l
   ```

### "Column does not exist" error

Run the full schema:
```bash
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d corpcommercialbank -f backend\schema.sql
```

---

## Reset PostgreSQL Password (if forgotten)

1. Stop PostgreSQL service:
   ```bash
   # In PowerShell as Administrator
   Stop-Service -Name postgresql-x64-16
   ```

2. Edit `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`:
   - Find line: `host all all 127.0.0.1/32 scram-sha-256`
   - Change to: `host all all 127.0.0.1/32 trust`

3. Start PostgreSQL:
   ```bash
   Start-Service -Name postgresql-x64-16
   ```

4. Reset password:
   ```bash
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
   ALTER USER postgres WITH PASSWORD 'new-password';
   \q
   ```

5. Revert step 2 (change `trust` back to `scram-sha-256`)

6. Restart PostgreSQL:
   ```bash
   Restart-Service -Name postgresql-x64-16
   ```

---

## Email Configuration (Optional)

For OTP emails to work:

1. **Gmail**:
   - Go to https://myaccount.google.com/apppasswords
   - Generate an app-specific password
   - Update `.env`:
     ```env
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASSWORD=16-char-app-password
     ```

2. **Skip email** (for development):
   - OTP will still be generated but not sent
   - Check server logs for OTP code

---

## Test the PIN Function

1. Start server: `npm start`
2. Open http://localhost:5000
3. Register/Login
4. Go to Profile → Set Transaction PIN
5. Enter current password and 6-digit PIN
6. Check console for success logs

---

## Need Help?

Check the server logs for error messages with emoji indicators:
- 🔵 = Info
- ✅ = Success  
- ❌ = Error
- ⚠️ = Warning
