import { verifyEvent, nip19 } from 'nostr-tools';
import { Keypair, Networks, TransactionBuilder, Operation, Account } from '@stellar/stellar-sdk';
import { config } from '../config/index.js';
import { investorModel, sessionModel } from '../models/index.js';
import { randomBytes } from 'crypto';

/**
 * NIP-98 Authentication
 * Verifies Nostr event signatures for HTTP authentication
 */
export async function authenticateNostr(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Nostr ')) {
      return res.status(401).json({ error: 'Missing Nostr authorization header' });
    }

    // Extract the base64-encoded event
    const base64Event = authHeader.substring(6);
    const eventJson = Buffer.from(base64Event, 'base64').toString('utf-8');
    const event = JSON.parse(eventJson);

    // Verify the event signature
    const isValid = verifyEvent(event);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Nostr signature' });
    }

    // Verify the event is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > 300) {
      return res.status(401).json({ error: 'Event timestamp too old or in future' });
    }

    // Check if event kind is 27235 (NIP-98 HTTP Auth)
    if (event.kind !== 27235) {
      return res.status(401).json({ error: 'Invalid event kind for HTTP auth' });
    }

    // Extract pubkey and find investor
    const pubkey = event.pubkey;
    const investor = investorModel.findByNostrPubkey(pubkey);

    if (!investor) {
      return res.status(404).json({ error: 'Investor not found' });
    }

    // Attach investor to request
    req.investor = investor;
    req.authMethod = 'nostr';
    
    next();
  } catch (error) {
    console.error('Nostr authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * SEP-0010 Stellar Authentication
 * Implements challenge-response authentication for Stellar accounts
 */
export class StellarAuth {
  constructor() {
    this.challenges = new Map(); // Store active challenges
    this.serverKeypair = config.stellar.serverKeypairSecret 
      ? Keypair.fromSecret(config.stellar.serverKeypairSecret)
      : Keypair.random(); // Use random keypair if not configured
  }

  // Generate challenge transaction
  async getChallenge(clientPublicKey) {
    try {
      const network = config.stellar.network === 'testnet' 
        ? Networks.TESTNET 
        : Networks.PUBLIC;

      // Create a challenge transaction
      const serverAccount = new Account(this.serverKeypair.publicKey(), '-1');
      const now = Math.floor(Date.now() / 1000);
      const timeout = 300; // 5 minutes

      // Generate random nonce
      const nonce = randomBytes(32).toString('base64');

      const transaction = new TransactionBuilder(serverAccount, {
        fee: '100',
        networkPassphrase: network,
        timebounds: {
          minTime: now,
          maxTime: now + timeout
        }
      })
        .addOperation(
          Operation.manageData({
            name: `${config.stellar.homeDomain} auth`,
            value: nonce,
            source: clientPublicKey
          })
        )
        .build();

      // Sign with server key
      transaction.sign(this.serverKeypair);

      const challenge = {
        transaction: transaction.toXDR(),
        publicKey: clientPublicKey,
        nonce,
        expiresAt: now + timeout
      };

      // Store challenge
      this.challenges.set(clientPublicKey, challenge);

      return {
        transaction: transaction.toXDR(),
        network_passphrase: network
      };
    } catch (error) {
      console.error('Error generating Stellar challenge:', error);
      throw error;
    }
  }

  // Verify signed challenge
  async verifyChallenge(signedTransactionXDR) {
    try {
      const network = config.stellar.network === 'testnet' 
        ? Networks.TESTNET 
        : Networks.PUBLIC;

      const transaction = TransactionBuilder.fromXDR(
        signedTransactionXDR,
        network
      );

      // Get client public key from transaction
      const clientPublicKey = transaction.operations[0].source;

      // Get stored challenge
      const challenge = this.challenges.get(clientPublicKey);

      if (!challenge) {
        throw new Error('Challenge not found or expired');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (now > challenge.expiresAt) {
        this.challenges.delete(clientPublicKey);
        throw new Error('Challenge expired');
      }

      // Verify signatures (both server and client)
      const serverSig = transaction.signatures.find(sig => 
        this.serverKeypair.verify(transaction.hash(), sig.signature())
      );

      const clientKeypair = Keypair.fromPublicKey(clientPublicKey);
      const clientSig = transaction.signatures.find(sig => 
        clientKeypair.verify(transaction.hash(), sig.signature())
      );

      if (!serverSig || !clientSig) {
        throw new Error('Invalid signatures');
      }

      // Clean up challenge
      this.challenges.delete(clientPublicKey);

      // Find investor
      const investor = investorModel.findByStellarPubkey(clientPublicKey);

      if (!investor) {
        throw new Error('Investor not found');
      }

      return investor;
    } catch (error) {
      console.error('Error verifying Stellar challenge:', error);
      throw error;
    }
  }
}

export const stellarAuth = new StellarAuth();

/**
 * Session-based authentication middleware
 * Verifies session token and loads investor
 */
export function requireAuth(req, res, next) {
  try {
    const sessionId = req.session?.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = sessionModel.findById(sessionId);

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      sessionModel.delete(sessionId);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Load investor
    const investor = investorModel.findById(session.investor_id);

    if (!investor) {
      return res.status(401).json({ error: 'Investor not found' });
    }

    req.investor = investor;
    req.session.authMethod = session.auth_method;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}
