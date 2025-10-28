# Coinbase Developer Platform (CDP) Setup Guide

This guide will help you set up CDP credentials for x402 AI payments in your Proof of Intelligence app.

## What is x402?

x402 is a payment protocol for AI that allows you to pay for LLM calls using crypto wallets. No API keys needed—payments are handled through HTTP 402 status codes and on-chain signatures.

## Setup Steps

### 1. Create a Coinbase Developer Platform Account

1. Go to [https://portal.cdp.coinbase.com/](https://portal.cdp.coinbase.com/)
2. Sign up or log in with your Coinbase account
3. Complete the onboarding process

### 2. Create API Credentials

1. In the CDP Portal, navigate to **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "Proof of Intelligence App")
4. Set permissions (you'll need wallet access)
5. Click **Create**

You'll receive:
- `CDP_API_KEY_ID` - Your API key identifier
- `CDP_API_KEY_SECRET` - Your API secret (save this immediately, you won't see it again!)

### 3. Create a Wallet

1. In the CDP Portal, navigate to **Wallets**
2. Click **Create Wallet**
3. Choose **MPC Wallet** (Multi-Party Computation)
4. Set a wallet name (e.g., "ai-payments")
5. Save the wallet credentials:
   - `CDP_WALLET_SECRET` - Your wallet secret
   - `CDP_WALLET_OWNER` - Your wallet owner name

### 4. Fund Your Wallet

You'll need to fund your CDP wallet with USDC or ETH to pay for AI calls:

1. Copy your wallet address from the CDP portal
2. Send USDC or ETH to this address
3. The x402 protocol will automatically deduct small amounts for each AI call

**Note**: AI calls are very cheap—typically fractions of a cent per question generation.

### 5. Add Environment Variables

Copy the `.env.example` file to `.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local` and add your CDP credentials:

```env
# Coinbase Developer Platform (CDP) for x402 AI Payments
CDP_API_KEY_ID=your_actual_api_key_id
CDP_API_KEY_SECRET=your_actual_api_key_secret
CDP_WALLET_SECRET=your_actual_wallet_secret
CDP_WALLET_OWNER=your_actual_wallet_owner_name
```

### 6. Verify Setup

Start your development server:

```bash
pnpm dev
```

Try generating a question—you should see x402 payments being processed in the logs.

## Troubleshooting

### "Insufficient funds" error
- Make sure your CDP wallet has USDC or ETH
- Check the wallet address in the CDP portal

### "Authentication failed" error
- Double-check your `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`
- Make sure there are no extra spaces in your `.env.local` file

### "Wallet not found" error
- Verify your `CDP_WALLET_OWNER` matches the wallet name exactly
- Check that your wallet was created successfully in the CDP portal

## Security Notes

**IMPORTANT**: Never commit your `.env.local` file to version control!

- Keep your `CDP_API_KEY_SECRET` and `CDP_WALLET_SECRET` secure
- These credentials can spend funds from your wallet
- Rotate keys if you suspect they've been compromised
- Use environment variables for production deployments

## Cost Estimation

Typical costs per question generation with GPT-4o:
- Simple question: ~$0.001 - $0.005 USD
- Complex question with context: ~$0.01 - $0.02 USD

For 1000 questions, expect to spend approximately $5-20 depending on complexity.

## Next Steps

Once your CDP credentials are set up:
1. The app will automatically use x402 for AI payments
2. Question generation will use GPT-4o via the Merit Systems Echo router
3. Payments will be deducted automatically from your CDP wallet
4. You can monitor spending in the CDP portal

## Support

- CDP Documentation: [https://docs.cdp.coinbase.com/](https://docs.cdp.coinbase.com/)
- x402 SDK: [https://www.npmjs.com/package/@merit-systems/ai-x402](https://www.npmjs.com/package/@merit-systems/ai-x402)
- Echo Router: [https://echo.merit.systems/docs](https://echo.merit.systems/docs)
