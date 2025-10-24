# NIP-98 Authentication Testing Guide

## ✅ NIP-98 Implementation Complete!

The Nostria dashboard now has full NIP-98 (Nostr HTTP Auth) authentication implemented.

## How It Works

When you click "Login with Nostr", the application:

1. **Checks for Browser Extension**: Verifies that `window.nostr` is available
2. **Gets Public Key**: Requests your public key from the extension
3. **Creates NIP-98 Event**: Builds a `kind 27235` event with:
   - `u` tag: The full URL being authenticated
   - `method` tag: The HTTP method (POST)
   - `created_at`: Current timestamp
   - Empty `content` field
4. **Signs Event**: Uses your extension to sign the event
5. **Sends to Server**: POSTs the signed event to `/auth/nostr/login`
6. **Server Validates**: Checks signature, timestamp, event kind, and finds investor
7. **Creates Session**: If valid, creates a 24-hour session

## Testing Instructions

### 1. Install a Nostr Browser Extension

Choose one:
- **nos2x** (Chrome/Firefox) - Lightweight, simple
- **Alby** (Chrome/Firefox) - Full-featured wallet
- **Flamingo** (Chrome) - Modern interface

### 2. Set Up Your Key in the Extension

You can either:
- Generate a new key in the extension
- Import an existing Nostr private key (nsec format)

### 3. Create a Test Investor

Start the server:
```powershell
npm start
```

In a new PowerShell terminal, create a test investor with YOUR Nostr public key:

```powershell
# Get your public key from your extension first, then use it here
$body = @{
    name = "Your Name"
    email = "your@email.com"
    nostr_pubkey = "YOUR_NOSTR_PUBLIC_KEY_HERE"  # In hex format, not npub
    investment_amount = 50000
    investment_date = "2024-01-15"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/investors" -Method Post -Body $body -ContentType "application/json"
```

**Important**: Use your public key in **hex format** (64 characters), not npub format. Most extensions show both formats.

### 4. Create Test Revenue Data

```powershell
$body = @{
    month = "January"
    year = 2024
    total_revenue = 100000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/revenues" -Method Post -Body $body -ContentType "application/json"
```

### 5. Test Login

1. Open http://localhost:3000 in your browser
2. Click "Login with Nostr"
3. Your extension will prompt you to approve the signature
4. Click "Approve" or "Sign"
5. You'll be logged in and see your dashboard!

## NIP-98 Specification Compliance

Our implementation follows NIP-98 exactly:

✅ **Event Kind**: 27235 (HTTP Auth)  
✅ **Tags Required**:
  - `u`: Absolute URL
  - `method`: HTTP method

✅ **Content**: Empty string  
✅ **Validation**:
  - Event kind must be 27235
  - Timestamp within 60 seconds
  - Valid signature
  - URL and method match request

✅ **Authorization Header**: Could be used instead of body (alternative implementation)

## API Endpoints

### Authentication
- `POST /auth/nostr/login` - NIP-98 authentication
- `POST /auth/stellar/challenge` - Get Stellar challenge
- `POST /auth/stellar/verify` - Verify Stellar signature
- `POST /auth/logout` - Logout
- `GET /auth/status` - Check auth status

### Dashboard (Requires Auth)
- `GET /api/investor/profile` - Get profile
- `GET /api/investor/dashboard` - Get dashboard data
- `GET /api/investor/payouts` - Get payout history

### Admin (No Auth Required - Add Auth in Production!)
- `POST /api/investors` - Create investor
- `GET /api/investors` - List all investors
- `POST /api/revenues` - Create revenue period
- `GET /api/revenues` - List all revenues

## Security Features

- ✅ Event signature verification using nostr-tools
- ✅ Timestamp validation (5-minute window)
- ✅ Event kind validation
- ✅ Session-based authentication
- ✅ 24-hour session expiry
- ✅ SQLite database with foreign keys

## Converting Public Key Formats

If you have an `npub...` format key, convert it to hex:

```javascript
// In browser console with nostr-tools loaded
import { nip19 } from 'nostr-tools';
const { data } = nip19.decode('npub1...');
console.log(data); // This is your hex public key
```

Or use online tools like https://damus.io/key/

## Troubleshooting

**"Please install a Nostr browser extension"**
- Install nos2x, Alby, or Flamingo extension
- Refresh the page

**"Investor not found"**
- Make sure you created an investor with your exact public key (hex format)
- Check the database: `sqlite3 data/nostria.db "SELECT * FROM investors;"`

**Extension doesn't prompt**
- Check if the extension is enabled
- Try refreshing the page
- Check browser console for errors

**"Authentication failed"**
- Check server logs for specific error
- Verify timestamp is within 5 minutes
- Ensure public key matches database record

## Next Steps for Production

1. Add admin authentication for investor/revenue endpoints
2. Implement rate limiting on auth endpoints
3. Add CORS configuration for specific origins
4. Use HTTPS and secure cookies
5. Add logging and monitoring
6. Implement SEP-0010 (Stellar) authentication fully
7. Add email notifications for payouts
8. Implement two-factor authentication option

## Resources

- NIP-98 Specification: https://github.com/nostr-protocol/nips/blob/master/98.md
- nostr-tools Documentation: https://github.com/nbd-wtf/nostr-tools
- Nostr Protocol: https://nostr.com/
