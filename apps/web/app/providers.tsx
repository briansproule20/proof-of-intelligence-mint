'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { useState } from 'react';
import { EchoProvider } from '@merit-systems/echo-react-sdk';

/**
 * App Providers
 *
 * Wraps the app with:
 * - WagmiProvider: Ethereum wallet connection
 * - QueryClientProvider: React Query for data fetching
 * - EchoProvider: x402 payment protocol for AI (polymarketeer pattern)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <EchoProvider appId={process.env.NEXT_PUBLIC_ECHO_APP_ID || ''}>
          {children}
        </EchoProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
