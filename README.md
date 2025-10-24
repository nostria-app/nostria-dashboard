# Nostria Investor Dashboard

A comprehensive dashboard for investors in the Nostria project, featuring Revenue Based Financing (RBF) tracking and dual authentication support.

## Features

- 🔐 **Dual Authentication**
  - NIP-98 (Nostr keys) authentication - **Fully Implemented!**
  - SEP-0010 (Stellar keys) authentication
- 💰 **Investment Tracking**
  - View investment amount and ownership percentage
  - Track revenue-based financing returns (50% revenue share)
  - Complete payout history
- 📊 **Dashboard Analytics**
  - Total payouts received
  - Expected monthly payouts
  - Revenue history
  - Investment statistics

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Authentication**: 
  - nostr-tools for NIP-98
  - @stellar/stellar-sdk for SEP-0010
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Session Management**: express-session

## Getting Started

### Prerequisites

- Node.js 18+ (latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nostria-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=3000
SESSION_SECRET=your-secure-random-secret-key
DATABASE_PATH=./data/nostria.db
TOTAL_INVESTMENT_POOL=400000
REVENUE_SHARE_PERCENTAGE=50
```

### Running the Application

**Development mode with auto-reload:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### Nostr Login (NIP-98)
```
POST /auth/nostr/login
Body: { "event": <nostr-event> }
```

#### Stellar Challenge (SEP-0010)
```
POST /auth/stellar/challenge
Body: { "public_key": "<stellar-public-key>" }
```

#### Stellar Verify
```
POST /auth/stellar/verify
Body: { "transaction": "<signed-xdr>" }
```

#### Logout
```
POST /auth/logout
```

#### Check Auth Status
```
GET /auth/status
```

### Investor Endpoints (Protected)

#### Get Profile
```
GET /api/investor/profile
```

#### Get Dashboard Data
```
GET /api/investor/dashboard
```

#### Get Payout History
```
GET /api/investor/payouts
```

### Admin Endpoints

#### Create Investor
```
POST /api/investors
Body: {
  "nostr_pubkey": "optional",
  "stellar_public_key": "optional",
  "name": "Investor Name",
  "email": "investor@example.com",
  "investment_amount": 50000,
  "investment_date": "2024-01-01"
}
```

#### Get All Investors
```
GET /api/investors
```

#### Create Revenue Period
```
POST /api/revenues
Body: {
  "month": "January",
  "year": 2024,
  "total_revenue": 100000
}
```

#### Get All Revenues
```
GET /api/revenues
```

## Revenue Based Financing (RBF) Model

Nostria operates with a Revenue Based Financing model:

- **Total Investment Pool**: $400,000
- **Revenue Share**: 50% of monthly revenues
- **Payout Calculation**: 
  - Each investor receives a percentage based on their investment
  - Formula: `(investor_amount / $400,000) × 50% × monthly_revenue`

### Example

If Nostria generates $50,000 in monthly revenue:
- Investor share pool: $25,000 (50%)
- Investor with $40,000 investment (10% ownership): $2,500
- Investor with $80,000 investment (20% ownership): $5,000

## Database Schema

### Investors Table
- `id`: Unique identifier
- `nostr_pubkey`: Nostr public key (optional)
- `stellar_public_key`: Stellar public key (optional)
- `name`: Investor name
- `email`: Contact email
- `investment_amount`: Investment amount in USD
- `investment_date`: Date of investment

### Monthly Revenues Table
- `id`: Auto-increment ID
- `month`: Month name
- `year`: Year
- `total_revenue`: Total monthly revenue
- `investor_share_percentage`: Percentage for investors (50%)
- `total_investor_payout`: Total amount for all investors

### Payout History Table
- `id`: Auto-increment ID
- `investor_id`: Reference to investor
- `revenue_period_id`: Reference to revenue period
- `payout_amount`: Amount paid to investor
- `payout_percentage`: Investor's ownership percentage
- `payout_date`: Date of payout
- `status`: pending, completed, or failed
- `transaction_hash`: Blockchain transaction reference

### Auth Sessions Table
- `id`: Session identifier
- `investor_id`: Reference to investor
- `auth_method`: 'nostr' or 'stellar'
- `expires_at`: Session expiration timestamp

## Security Considerations

### Production Deployment Checklist

- [ ] Change `SESSION_SECRET` to a cryptographically secure random string
- [ ] Use HTTPS (set `cookie.secure: true` in session config)
- [ ] Implement rate limiting on authentication endpoints
- [ ] Add admin authentication for sensitive endpoints
- [ ] Validate and sanitize all user inputs
- [ ] Use environment variables for all secrets
- [ ] Enable CORS with specific origins only
- [ ] Implement request logging and monitoring
- [ ] Regular security audits and dependency updates
- [ ] Database backups and disaster recovery plan

### Authentication Notes

- **NIP-98**: Fully implemented! Works with Nostr browser extensions (nos2x, Alby, Flamingo). See [NIP98-TESTING.md](./NIP98-TESTING.md) for detailed testing instructions.
- **SEP-0010**: Implements Stellar Web Authentication standard
- Sessions expire after 24 hours
- All sensitive endpoints require authentication

## Testing NIP-98 Authentication

See the [NIP-98 Testing Guide](./NIP98-TESTING.md) for complete instructions on:
- Installing Nostr browser extensions
- Creating test investors
- Testing the login flow
- Troubleshooting common issues

Quick start:
1. Install a Nostr extension (nos2x, Alby, or Flamingo)
2. Run `npm start`
3. Use PowerShell commands in `test-commands.ps1` to create test data
4. Open http://localhost:3000 and click "Login with Nostr"

## Development

### Project Structure
```
nostria-dashboard/
├── src/
│   ├── config/
│   │   └── index.js          # Configuration management
│   ├── db/
│   │   └── database.js        # Database initialization
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── models/
│   │   └── index.js           # Database models
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   └── api.js             # API routes
│   └── server.js              # Express server setup
├── public/
│   └── index.html             # Frontend dashboard
├── data/                      # SQLite database (auto-created)
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore
├── package.json
└── README.md
```

### Adding Sample Data

Use the admin endpoints to create test data:

```bash
# Create an investor
curl -X POST http://localhost:3000/api/investors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Investor",
    "nostr_pubkey": "test-pubkey",
    "investment_amount": 50000,
    "investment_date": "2024-01-01"
  }'

# Add revenue period
curl -X POST http://localhost:3000/api/revenues \
  -H "Content-Type: application/json" \
  -d '{
    "month": "January",
    "year": 2024,
    "total_revenue": 100000
  }'
```

## License

See LICENSE file for details.

## Support

For issues, questions, or contributions, please open an issue on the repository.
