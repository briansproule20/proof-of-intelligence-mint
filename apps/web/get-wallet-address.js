require('dotenv').config({ path: '.env.local' });
const { CdpClient } = require('@coinbase/cdp-sdk');

async function getWalletAddress() {
  try {
    console.log('Initializing CDP wallet...');

    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET.replace(/"/g, ''),
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const account = await cdp.evm.getOrCreateAccount({
      name: process.env.CDP_WALLET_OWNER,
    });

    console.log('');
    console.log('✅ SUCCESS! CDP Wallet Created/Retrieved');
    console.log('');
    console.log('📍 Wallet Address:', account.address);
    console.log('');
    console.log('💰 To fund this wallet:');
    console.log('   1. Go to: https://portal.cdp.coinbase.com/products/faucet');
    console.log('   2. Enter address:', account.address);
    console.log('   3. Request Base Sepolia ETH');
    console.log('');
    console.log('Or send USDC/ETH from another wallet to:', account.address);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Check your .env.local file for correct CDP credentials');
  }
}

getWalletAddress();
