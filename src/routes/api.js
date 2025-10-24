import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { investorModel, revenueModel, payoutModel } from '../models/index.js';
import { config } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/investor/profile
 * Get current investor's profile
 */
router.get('/profile', requireAuth, (req, res) => {
  try {
    const investor = req.investor;

    res.json({
      id: investor.id,
      name: investor.name,
      email: investor.email,
      investment_amount: investor.investment_amount,
      investment_date: investor.investment_date,
      nostr_pubkey: investor.nostr_pubkey,
      stellar_public_key: investor.stellar_public_key
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/investor/dashboard
 * Get investor's dashboard data including investment stats and recent payouts
 */
router.get('/dashboard', requireAuth, (req, res) => {
  try {
    const investor = req.investor;
    const allInvestors = investorModel.getAll();
    const totalInvestmentPool = config.nostria.totalInvestmentPool;

    // Calculate investor's share percentage
    const investorSharePercentage = (investor.investment_amount / totalInvestmentPool) * 100;

    // Get recent revenues
    const recentRevenues = revenueModel.getAll().slice(0, 12); // Last 12 months

    // Get investor's payout history
    const payouts = payoutModel.getByInvestorId(investor.id);

    // Calculate total payouts received
    const totalPayoutsReceived = payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.payout_amount, 0);

    // Calculate expected monthly payout from latest revenue
    let expectedMonthlyPayout = 0;
    if (recentRevenues.length > 0) {
      const latestRevenue = recentRevenues[0];
      expectedMonthlyPayout = (latestRevenue.total_investor_payout * investorSharePercentage) / 100;
    }

    res.json({
      investor: {
        name: investor.name,
        investment_amount: investor.investment_amount,
        investment_date: investor.investment_date,
        share_percentage: investorSharePercentage.toFixed(4)
      },
      stats: {
        total_investment_pool: totalInvestmentPool,
        total_payouts_received: totalPayoutsReceived,
        expected_monthly_payout: expectedMonthlyPayout,
        total_payouts_count: payouts.length,
        pending_payouts_count: payouts.filter(p => p.status === 'pending').length
      },
      recent_revenues: recentRevenues.slice(0, 6),
      recent_payouts: payouts.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/investor/payouts
 * Get investor's complete payout history
 */
router.get('/payouts', requireAuth, (req, res) => {
  try {
    const investor = req.investor;
    const payouts = payoutModel.getByInvestorId(investor.id);

    res.json({
      payouts,
      total_count: payouts.length,
      total_amount: payouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.payout_amount, 0)
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

/**
 * GET /api/revenues
 * Get all revenue periods (public data)
 */
router.get('/revenues', (req, res) => {
  try {
    const revenues = revenueModel.getAll();

    res.json({
      revenues,
      total_count: revenues.length,
      total_revenue: revenues.reduce((sum, r) => sum + r.total_revenue, 0),
      total_investor_payouts: revenues.reduce((sum, r) => sum + r.total_investor_payout, 0)
    });
  } catch (error) {
    console.error('Error fetching revenues:', error);
    res.status(500).json({ error: 'Failed to fetch revenues' });
  }
});

/**
 * POST /api/revenues
 * Create a new revenue period and calculate payouts (admin endpoint)
 * Note: In production, this should be protected with admin authentication
 */
router.post('/revenues', async (req, res) => {
  try {
    const { month, year, total_revenue } = req.body;

    if (!month || !year || total_revenue === undefined) {
      return res.status(400).json({ error: 'month, year, and total_revenue are required' });
    }

    // Check if revenue period already exists
    const existing = revenueModel.findByPeriod(month, year);
    if (existing) {
      return res.status(400).json({ error: 'Revenue period already exists' });
    }

    // Calculate investor share
    const investorSharePercentage = config.nostria.revenueSharePercentage;
    const totalInvestorPayout = (total_revenue * investorSharePercentage) / 100;

    // Create revenue record
    const result = revenueModel.create({
      month,
      year,
      total_revenue,
      investor_share_percentage: investorSharePercentage,
      total_investor_payout: totalInvestorPayout
    });

    const revenuePeriodId = result.lastInsertRowid;

    // Get all investors
    const investors = investorModel.getAll();
    const totalInvestmentPool = config.nostria.totalInvestmentPool;

    // Create payout records for each investor
    const payoutDate = new Date().toISOString();
    const payouts = [];

    for (const investor of investors) {
      const investorPercentage = (investor.investment_amount / totalInvestmentPool) * 100;
      const payoutAmount = (totalInvestorPayout * investorPercentage) / 100;

      payoutModel.create({
        investor_id: investor.id,
        revenue_period_id: revenuePeriodId,
        payout_amount: payoutAmount,
        payout_percentage: investorPercentage,
        payout_date: payoutDate,
        status: 'pending'
      });

      payouts.push({
        investor_id: investor.id,
        investor_name: investor.name,
        payout_amount: payoutAmount,
        payout_percentage: investorPercentage
      });
    }

    res.json({
      success: true,
      revenue_period: {
        id: revenuePeriodId,
        month,
        year,
        total_revenue,
        total_investor_payout: totalInvestorPayout
      },
      payouts
    });
  } catch (error) {
    console.error('Error creating revenue period:', error);
    res.status(500).json({ error: 'Failed to create revenue period' });
  }
});

/**
 * POST /api/investors
 * Create a new investor (admin endpoint)
 * Note: In production, this should be protected with admin authentication
 */
router.post('/investors', async (req, res) => {
  try {
    const { nostr_pubkey, stellar_public_key, name, email, investment_amount, investment_date } = req.body;

    if (!investment_amount || !investment_date) {
      return res.status(400).json({ error: 'investment_amount and investment_date are required' });
    }

    if (!nostr_pubkey && !stellar_public_key) {
      return res.status(400).json({ error: 'Either nostr_pubkey or stellar_public_key is required' });
    }

    const investorId = uuidv4();

    investorModel.create({
      id: investorId,
      nostr_pubkey: nostr_pubkey || null,
      stellar_public_key: stellar_public_key || null,
      name: name || null,
      email: email || null,
      investment_amount: parseFloat(investment_amount),
      investment_date
    });

    const investor = investorModel.findById(investorId);

    res.json({
      success: true,
      investor
    });
  } catch (error) {
    console.error('Error creating investor:', error);
    res.status(500).json({ error: 'Failed to create investor' });
  }
});

/**
 * GET /api/investors
 * Get all investors (admin endpoint)
 * Note: In production, this should be protected with admin authentication
 */
router.get('/investors', (req, res) => {
  try {
    const investors = investorModel.getAll();
    const totalInvestmentPool = config.nostria.totalInvestmentPool;

    const investorsWithStats = investors.map(investor => {
      const sharePercentage = (investor.investment_amount / totalInvestmentPool) * 100;
      const payouts = payoutModel.getByInvestorId(investor.id);
      const totalPayouts = payouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.payout_amount, 0);

      return {
        ...investor,
        share_percentage: sharePercentage,
        total_payouts: totalPayouts,
        payout_count: payouts.length
      };
    });

    res.json({
      investors: investorsWithStats,
      total_count: investors.length,
      total_investment: investors.reduce((sum, i) => sum + i.investment_amount, 0)
    });
  } catch (error) {
    console.error('Error fetching investors:', error);
    res.status(500).json({ error: 'Failed to fetch investors' });
  }
});

export default router;
