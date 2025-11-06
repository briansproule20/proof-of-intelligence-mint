import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected({
      target: 'metaMask',
    }),
    injected({
      target: 'phantom',
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    // Use Cloudflare's Base RPC - better rate limits
    [base.id]: http('https://base.llamarpc.com'),
  },
});
