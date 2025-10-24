import express from 'express';
import { stellarAuth } from '../middleware/auth.js';
import { investorModel, sessionModel } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /auth/stellar/challenge
 * Get a Stellar SEP-0010 challenge transaction
 */
router.post('/stellar/challenge', async (req, res) => {
  try {
    const { public_key } = req.body;

    if (!public_key) {
      return res.status(400).json({ error: 'public_key is required' });
    }

    const challenge = await stellarAuth.getChallenge(public_key);
    
    res.json(challenge);
  } catch (error) {
    console.error('Error generating challenge:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

/**
 * POST /auth/stellar/verify
 * Verify signed Stellar challenge and create session
 */
router.post('/stellar/verify', async (req, res) => {
  try {
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'transaction is required' });
    }

    const investor = await stellarAuth.verifyChallenge(transaction);

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    sessionModel.create({
      id: sessionId,
      investor_id: investor.id,
      auth_method: 'stellar',
      expires_at: expiresAt.toISOString()
    });

    // Set session
    req.session.sessionId = sessionId;

    res.json({
      success: true,
      investor: {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        investment_amount: investor.investment_amount
      }
    });
  } catch (error) {
    console.error('Error verifying challenge:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/nostr/login
 * Authenticate with Nostr NIP-98
 */
router.post('/nostr/login', async (req, res) => {
  console.log('🔐 Nostr login attempt received');
  console.log('Request body:', req.body);
  
  try {
    const { event } = req.body;

    if (!event) {
      console.log('❌ No event in request body');
      return res.status(400).json({ error: 'event is required' });
    }

    console.log('Event received:', JSON.stringify(event, null, 2));

    // Import verifyEvent
    const { verifyEvent } = await import('nostr-tools');

    // Verify the event signature
    const isValid = verifyEvent(event);
    console.log('Signature valid:', isValid);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Nostr signature' });
    }

    // Verify the event is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - event.created_at);
    console.log('Time difference:', timeDiff, 'seconds');
    
    if (timeDiff > 300) {
      return res.status(401).json({ error: 'Event timestamp too old or in future' });
    }

    // Check if event kind is 27235 (NIP-98 HTTP Auth)
    console.log('Event kind:', event.kind);
    if (event.kind !== 27235) {
      return res.status(401).json({ error: 'Invalid event kind for HTTP auth' });
    }

    // Extract pubkey and find investor
    const pubkey = event.pubkey;
    console.log('Looking for investor with pubkey:', pubkey);
    const investor = investorModel.findByNostrPubkey(pubkey);

    if (!investor) {
      console.log('❌ Investor not found');
      return res.status(404).json({ error: 'Investor not found' });
    }

    console.log('✅ Investor found:', investor.name);

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    sessionModel.create({
      id: sessionId,
      investor_id: investor.id,
      auth_method: 'nostr',
      expires_at: expiresAt.toISOString()
    });

    // Set session
    req.session.sessionId = sessionId;

    console.log('✅ Session created:', sessionId);

    res.json({
      success: true,
      investor: {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        investment_amount: investor.investment_amount
      }
    });
  } catch (error) {
    console.error('❌ Nostr login error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/logout
 * Logout and destroy session
 */
router.post('/logout', (req, res) => {
  const sessionId = req.session?.sessionId;

  if (sessionId) {
    sessionModel.delete(sessionId);
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  const sessionId = req.session?.sessionId;

  if (!sessionId) {
    return res.json({ authenticated: false });
  }

  const session = sessionModel.findById(sessionId);

  if (!session) {
    return res.json({ authenticated: false });
  }

  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  if (now > expiresAt) {
    sessionModel.delete(sessionId);
    return res.json({ authenticated: false });
  }

  const investor = investorModel.findById(session.investor_id);

  res.json({
    authenticated: true,
    investor: {
      id: investor.id,
      name: investor.name,
      email: investor.email,
      investment_amount: investor.investment_amount
    },
    auth_method: session.auth_method
  });
});

export default router;
