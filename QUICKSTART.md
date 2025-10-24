# Quick Start Guide

## Install Dependencies

First, install all required npm packages:

```powershell
npm install
```

## Setup Environment

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

The default configuration is ready to use for development.

## Start the Server

Run in development mode with auto-reload:

```powershell
npm run dev
```

The server will start at `http://localhost:3000`

## Create Sample Data

Open a new PowerShell terminal and create a test investor:

```powershell
$body = @{
    name = "John Investor"
    nostr_pubkey = "npub1test123"
    investment_amount = 50000
    investment_date = "2024-01-15"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/investors" -Method Post -Body $body -ContentType "application/json"
```

Create a revenue period:

```powershell
$body = @{
    month = "January"
    year = 2024
    total_revenue = 100000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/revenues" -Method Post -Body $body -ContentType "application/json"
```

## Access the Dashboard

Open your browser and navigate to:
- Dashboard: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

## Next Steps

1. Configure authentication keys in `.env` for production use
2. Implement full NIP-98 and SEP-0010 authentication flows
3. Add admin authentication to protect sensitive endpoints
4. Set up SSL/TLS for production deployment
5. Configure database backups

## Troubleshooting

If you encounter issues:

1. Check Node.js version: `node --version` (requires 18+)
2. Verify all dependencies installed: `npm install`
3. Check if port 3000 is available
4. Review logs in the terminal for error messages
