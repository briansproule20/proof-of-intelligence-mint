import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    // Use Cloudflare's public RPC which supports CORS from localhost
    // This is critical for x402-fetch to work properly from the browser
    [base.id]: http('https://base.gateway.tenderly.co'),
  },
});
