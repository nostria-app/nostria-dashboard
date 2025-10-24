import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-me',
  
  database: {
    path: process.env.DATABASE_PATH || './data/nostria.db'
  },
  
  nostria: {
    totalInvestmentPool: parseFloat(process.env.TOTAL_INVESTMENT_POOL) || 400000,
    revenueSharePercentage: parseFloat(process.env.REVENUE_SHARE_PERCENTAGE) || 50
  },
  
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    serverKeypairSecret: process.env.STELLAR_SERVER_KEYPAIR_SECRET,
    homeDomain: process.env.STELLAR_HOME_DOMAIN || 'nostria.app'
  },
  
  nostr: {
    relayUrl: process.env.NOSTR_RELAY_URL || 'wss://relay.damus.io'
  }
};
