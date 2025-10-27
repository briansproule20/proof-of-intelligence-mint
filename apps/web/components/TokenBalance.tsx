'use client';

import { useAccount, useReadContract } from 'wagmi';
import { POIC_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { formatUnits } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Coins, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TokenBalance() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: balance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: POIC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && mounted,
    },
  });

  if (!mounted || !isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Your POIC Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            <span className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Your POIC Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading...
            </span>
          ) : (
            <span>{formatUnits(balance || 0n, 18)} POIC</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
