import db from '../db/database.js';

export const investorModel = {
  // Create a new investor
  create(investorData) {
    const stmt = db.prepare(`
      INSERT INTO investors (id, nostr_pubkey, stellar_public_key, name, email, investment_amount, investment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      investorData.id,
      investorData.nostr_pubkey || null,
      investorData.stellar_public_key || null,
      investorData.name || null,
      investorData.email || null,
      investorData.investment_amount,
      investorData.investment_date
    );
  },

  // Find investor by Nostr public key
  findByNostrPubkey(pubkey) {
    const stmt = db.prepare('SELECT * FROM investors WHERE nostr_pubkey = ?');
    return stmt.get(pubkey);
  },

  // Find investor by Stellar public key
  findByStellarPubkey(pubkey) {
    const stmt = db.prepare('SELECT * FROM investors WHERE stellar_public_key = ?');
    return stmt.get(pubkey);
  },

  // Find investor by ID
  findById(id) {
    const stmt = db.prepare('SELECT * FROM investors WHERE id = ?');
    return stmt.get(id);
  },

  // Get all investors
  getAll() {
    const stmt = db.prepare('SELECT * FROM investors');
    return stmt.all();
  },

  // Update investor
  update(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const stmt = db.prepare(`
      UPDATE investors 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    return stmt.run(...values, id);
  }
};

export const revenueModel = {
  // Create monthly revenue record
  create(revenueData) {
    const stmt = db.prepare(`
      INSERT INTO monthly_revenues (month, year, total_revenue, investor_share_percentage, total_investor_payout)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      revenueData.month,
      revenueData.year,
      revenueData.total_revenue,
      revenueData.investor_share_percentage,
      revenueData.total_investor_payout
    );
  },

  // Get revenue by month and year
  findByPeriod(month, year) {
    const stmt = db.prepare('SELECT * FROM monthly_revenues WHERE month = ? AND year = ?');
    return stmt.get(month, year);
  },

  // Get all revenues
  getAll() {
    const stmt = db.prepare('SELECT * FROM monthly_revenues ORDER BY year DESC, month DESC');
    return stmt.all();
  },

  // Get revenues for current year
  getCurrentYear() {
    const currentYear = new Date().getFullYear();
    const stmt = db.prepare('SELECT * FROM monthly_revenues WHERE year = ? ORDER BY month DESC');
    return stmt.all(currentYear);
  }
};

export const payoutModel = {
  // Create payout record
  create(payoutData) {
    const stmt = db.prepare(`
      INSERT INTO payout_history (investor_id, revenue_period_id, payout_amount, payout_percentage, payout_date, status, transaction_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      payoutData.investor_id,
      payoutData.revenue_period_id,
      payoutData.payout_amount,
      payoutData.payout_percentage,
      payoutData.payout_date,
      payoutData.status || 'pending',
      payoutData.transaction_hash || null
    );
  },

  // Get payouts for an investor
  getByInvestorId(investorId) {
    const stmt = db.prepare(`
      SELECT 
        ph.*,
        mr.month,
        mr.year,
        mr.total_revenue,
        mr.total_investor_payout
      FROM payout_history ph
      JOIN monthly_revenues mr ON ph.revenue_period_id = mr.id
      WHERE ph.investor_id = ?
      ORDER BY mr.year DESC, mr.month DESC
    `);
    
    return stmt.all(investorId);
  },

  // Get all payouts for a revenue period
  getByRevenuePeriod(revenuePeriodId) {
    const stmt = db.prepare(`
      SELECT 
        ph.*,
        i.name,
        i.email,
        i.investment_amount
      FROM payout_history ph
      JOIN investors i ON ph.investor_id = i.id
      WHERE ph.revenue_period_id = ?
    `);
    
    return stmt.all(revenuePeriodId);
  },

  // Update payout status
  updateStatus(id, status, transactionHash = null) {
    const stmt = db.prepare(`
      UPDATE payout_history 
      SET status = ?, transaction_hash = ?
      WHERE id = ?
    `);
    
    return stmt.run(status, transactionHash, id);
  }
};

export const sessionModel = {
  // Create auth session
  create(sessionData) {
    const stmt = db.prepare(`
      INSERT INTO auth_sessions (id, investor_id, auth_method, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(
      sessionData.id,
      sessionData.investor_id,
      sessionData.auth_method,
      sessionData.expires_at
    );
  },

  // Find session by ID
  findById(id) {
    const stmt = db.prepare('SELECT * FROM auth_sessions WHERE id = ?');
    return stmt.get(id);
  },

  // Delete expired sessions
  deleteExpired() {
    const stmt = db.prepare('DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP');
    return stmt.run();
  },

  // Delete session
  delete(id) {
    const stmt = db.prepare('DELETE FROM auth_sessions WHERE id = ?');
    return stmt.run(id);
  }
};
