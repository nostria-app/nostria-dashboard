// Sample Nostr public key for testing
// This is a test public key - in production, users would use their own keys
const testNostrPubkey = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';

async function createTestInvestor() {
  try {
    console.log('Creating test investor...');
    
    const response = await fetch('http://localhost:3000/api/investors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Investor',
        email: 'test@example.com',
        nostr_pubkey: testNostrPubkey,
        investment_amount: 50000,
        investment_date: '2024-01-15'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Test investor created successfully!');
      console.log('Investor ID:', data.investor.id);
      console.log('Nostr Public Key:', testNostrPubkey);
      console.log('\nYou can now login using a Nostr extension with this public key.');
    } else {
      console.error('❌ Failed to create investor:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function createTestRevenue() {
  try {
    console.log('\nCreating test revenue period...');
    
    const response = await fetch('http://localhost:3000/api/revenues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        month: 'January',
        year: 2024,
        total_revenue: 100000
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Test revenue period created successfully!');
      console.log('Revenue Period ID:', data.revenue_period.id);
      console.log('Total Revenue: $', data.revenue_period.total_revenue);
      console.log('Investor Payout: $', data.revenue_period.total_investor_payout);
      console.log('\nPayouts created for', data.payouts.length, 'investor(s)');
    } else {
      console.error('❌ Failed to create revenue:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the setup
(async () => {
  await createTestInvestor();
  await createTestRevenue();
  
  console.log('\n==============================================');
  console.log('Test data created! Open http://localhost:3000');
  console.log('==============================================');
  console.log('\nTo test login:');
  console.log('1. Install a Nostr browser extension (nos2x, Alby, or Flamingo)');
  console.log('2. Import or generate a key in the extension');
  console.log('3. Click "Login with Nostr" button');
  console.log('\nTest Nostr Public Key: ' + testNostrPubkey);
})();
