# Secret Setup (SQL)

This folder is configured so your SQL credentials stay outside source code.

## 1) Create your local secrets file

In this folder:

1. Copy `.env.example` to `.env`
2. Fill in real values for:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`

`.env` is ignored by git and will not be committed.

## 2) Use env vars in your app

Never hardcode passwords or connection strings in source files. Read values from environment variables at runtime.

Common env var names:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECTION_STRING` (optional)

## 3) Optional: set env vars at OS level (Windows)

PowerShell (current session):

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="1433"
$env:DB_NAME="MyDatabase"
$env:DB_USER="app_user"
$env:DB_PASSWORD="your_password_here"
```

Persist for your user profile:

```powershell
[System.Environment]::SetEnvironmentVariable("DB_HOST","localhost","User")
[System.Environment]::SetEnvironmentVariable("DB_PORT","1433","User")
[System.Environment]::SetEnvironmentVariable("DB_NAME","MyDatabase","User")
[System.Environment]::SetEnvironmentVariable("DB_USER","app_user","User")
[System.Environment]::SetEnvironmentVariable("DB_PASSWORD","your_password_here","User")
```

## 4) Recommended next step

Tell me your stack (`Node`, `Python`, `.NET`, etc.) and I can add the exact connection/config code for your app.
