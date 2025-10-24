# Quick PowerShell Commands for Testing

# 1. Start the server (run this first)
npm start

# 2. In a NEW PowerShell window, create a test investor
# Replace YOUR_HEX_PUBKEY with your actual Nostr public key in hex format (64 chars)
$investorBody = @{
    name = "Test Investor"
    email = "test@nostria.app"
    nostr_pubkey = "YOUR_HEX_PUBKEY_HERE"
    investment_amount = 50000
    investment_date = "2024-01-15"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/investors" -Method Post -Body $investorBody -ContentType "application/json"

# 3. Create a revenue period for January 2024
$revenueBody = @{
    month = "January"
    year = 2024
    total_revenue = 100000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/revenues" -Method Post -Body $revenueBody -ContentType "application/json"

# 4. Create another revenue period for February 2024
$revenueBody2 = @{
    month = "February"
    year = 2024
    total_revenue = 120000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/revenues" -Method Post -Body $revenueBody2 -ContentType "application/json"

# 5. Check health endpoint
Invoke-RestMethod -Uri "http://localhost:3000/health"

# 6. List all investors
Invoke-RestMethod -Uri "http://localhost:3000/api/investors"

# 7. List all revenues
Invoke-RestMethod -Uri "http://localhost:3000/api/revenues"

# Example: Create multiple investors
$investor2 = @{
    name = "Alice Cooper"
    email = "alice@nostria.app"
    nostr_pubkey = "aaaa0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"
    investment_amount = 80000
    investment_date = "2024-01-20"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/investors" -Method Post -Body $investor2 -ContentType "application/json"

$investor3 = @{
    name = "Bob Builder"
    email = "bob@nostria.app"
    stellar_public_key = "GBHNH3323OWHG3PPVLMMIMT7ETR3NP573UCZIALGIDG6D5Q4QINAEUSX"
    investment_amount = 120000
    investment_date = "2024-02-01"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/investors" -Method Post -Body $investor3 -ContentType "application/json"
