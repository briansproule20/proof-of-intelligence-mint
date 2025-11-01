'use client';

import { useReadContract } from 'wagmi';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { DollarSign, Droplets, ExternalLink } from 'lucide-react';
import {
  CONTRACT_ADDRESS,
  POIC_ABI,
  USDC_ADDRESS,
  USDC_ABI,
  SERVER_WALLET_ADDRESS,
  CHAIN_ID
} from '@/lib/contract';
import { formatUnits } from 'viem';
import { base } from 'wagmi/chains';

const TOKENS_PER_MINT = 5000;
const TARGET_MINTS = 100000;
const PRICE_PER_TOKEN = 0.0002; // $0.0002 per POIC (1 USDC / 5000 POIC)

export function TokenStats() {
  // Fetch total supply from POIC contract
  const { data: totalSupply, isLoading: isLoadingSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: POIC_ABI,
    functionName: 'totalSupply',
    chainId: CHAIN_ID,
  });

  // Fetch USDC balance of server wallet (LP pool)
  const { data: usdcBalance, isLoading: isLoadingUsdc } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [SERVER_WALLET_ADDRESS],
    chainId: base.id, // Base mainnet for USDC
  });

  // Calculate stats
  const totalMinted = totalSupply ? Number(formatUnits(totalSupply, 18)) : 0;
  const lpPoolBalance = usdcBalance ? Number(formatUnits(usdcBalance, 6)) : 0; // USDC has 6 decimals

  // TODO: Track actual user mints properly
  // Current totalSupply includes pre-minted tokens, not just user mints
  // Need to either:
  // 1. Add a public counter variable to the contract (mintCount)
  // 2. Listen to TokensMinted events and count them
  // 3. Track mints in a backend database
  // For now, we calculate based on LP pool USDC balance (1 USDC = 1 mint)

  const numberOfMints = lpPoolBalance > 0 ? Math.floor(lpPoolBalance) : 0; // Each USDC = 1 mint
  const progressPercent = Math.min((numberOfMints / TARGET_MINTS) * 100, 100);

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <section className="container mx-auto px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-12 max-w-4xl mx-auto">
          {/* Left: POIC Logo */}
          <div className="flex justify-center mb-8 md:mb-0">
            <div className="relative w-48 h-48 md:w-64 md:h-64">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <Image
                src="/poic-favicon.png"
                alt="POIC Token"
                width={256}
                height={256}
                className="relative w-full h-full"
                priority
              />
            </div>
          </div>

          {/* Right: Progress Chart */}
          <div className="space-y-6 px-4 md:px-0">
            <div>
              <h3 className="text-2xl font-bold mb-2">POIC Token Launch</h3>
              <p className="text-muted-foreground">Progress to Uniswap V4 LP Launch</p>
            </div>

            {/* Total Circulation */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Circulation</span>
                <span className="text-muted-foreground">
                  {isLoadingSupply ? '...' : `${formatNumber(totalMinted)} POIC`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Includes pre-minted supply</p>
            </div>

            {/* Progress Bar - Successful Mints */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Successful Mints</span>
                <span className="text-muted-foreground">
                  {isLoadingSupply ? '...' : `${numberOfMints.toLocaleString()} / ${TARGET_MINTS.toLocaleString()}`}
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoadingSupply ? 'Loading...' : `${progressPercent.toFixed(2)}% to LP launch`}
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Current Price
                </div>
                <div className="text-2xl font-bold">${PRICE_PER_TOKEN}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="h-4 w-4" />
                  LP Pool
                </div>
                <div className="text-2xl font-bold">
                  {isLoadingUsdc ? '...' : `$${lpPoolBalance.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explorer Links */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <a
              href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Basescan
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <a
              href={`https://base.blockscout.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Blockscout
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
