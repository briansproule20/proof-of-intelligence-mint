'use client';

import { useReadContract, usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
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
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const [mintCount, setMintCount] = useState<number>(0);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

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

  // Fetch TokensMinted events to count actual mints
  useEffect(() => {
    async function fetchMintEvents() {
      if (!publicClient) return;

      try {
        setIsLoadingEvents(true);

        // Get current block first
        const currentBlock = await publicClient.getBlockNumber();

        // RPC allows max 1000 blocks per query, so we need to chunk
        // Query last 10k blocks in 1000-block chunks (roughly 5.5 hours on Base at ~2s per block)
        // This should capture all recent mints without overwhelming the RPC
        const BLOCKS_PER_CHUNK = BigInt(1000);
        const TOTAL_BLOCKS_TO_QUERY = BigInt(10000);

        const startBlock = currentBlock > TOTAL_BLOCKS_TO_QUERY
          ? currentBlock - TOTAL_BLOCKS_TO_QUERY
          : BigInt(0);

        console.log('[TokenStats] Querying events from block', startBlock.toString(), 'to', currentBlock.toString());

        let allLogs: any[] = [];

        // Helper to delay between requests to avoid rate limiting
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Query in chunks of 1000 blocks with delays
        for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += BLOCKS_PER_CHUNK) {
          const toBlock = fromBlock + BLOCKS_PER_CHUNK > currentBlock
            ? currentBlock
            : fromBlock + BLOCKS_PER_CHUNK;

          const logs = await publicClient.getLogs({
            address: CONTRACT_ADDRESS,
            event: {
              type: 'event',
              name: 'TokensMinted',
              inputs: [
                { name: 'to', type: 'address', indexed: true },
                { name: 'amount', type: 'uint256', indexed: false },
                { name: 'nonce', type: 'uint256', indexed: false },
              ],
            },
            fromBlock,
            toBlock,
          });

          allLogs = [...allLogs, ...logs];

          // Add 200ms delay between requests to avoid rate limiting
          await delay(200);
        }

        // Each event = 1 successful mint
        setMintCount(allLogs.length);
        console.log('[TokenStats] Found', allLogs.length, 'TokensMinted events');
      } catch (error) {
        console.error('[TokenStats] Error fetching mint events:', error);
        // Fallback: show 0 mints if events can't be fetched
        setMintCount(0);
      } finally {
        setIsLoadingEvents(false);
      }
    }

    fetchMintEvents();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMintEvents, 30000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Calculate stats
  const totalMinted = totalSupply ? Number(formatUnits(totalSupply, 18)) : 0;
  const lpPoolBalance = usdcBalance ? Number(formatUnits(usdcBalance, 6)) : 0; // USDC has 6 decimals

  const numberOfMints = mintCount; // Count from TokensMinted events
  const progressPercent = Math.min((numberOfMints / TARGET_MINTS) * 100, 100);

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <section id="stats" className="container mx-auto px-4 py-20">
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
                  {isLoadingEvents ? '...' : `${numberOfMints.toLocaleString()} / ${TARGET_MINTS.toLocaleString()}`}
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoadingEvents ? 'Loading events from blockchain...' : `${progressPercent.toFixed(2)}% to LP launch • Counted from TokensMinted events`}
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
