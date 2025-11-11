'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';
import { formatUnits } from 'viem';
import {
  getRankForBalance,
  getProgressToNextRank,
  formatPOICBalance,
  COGNITIVE_RANKS
} from '@/lib/poic-ranking';
import { Brain, TrendingUp, Award, AlertCircle, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export default function DepartmentOfCognitionWallet() {
  const { address, isConnected } = useAccount();
  const cardRef = useRef<HTMLDivElement>(null);

  // Read user's POIC balance
  const { data: balance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Parse balance and get current rank
  const balanceNumber = balance ? Number(formatUnits(balance, 18)) : 0;
  const currentRank = getRankForBalance(balanceNumber);
  const progressData = getProgressToNextRank(balanceNumber);

  // Initialize rank index to current rank
  const [rankIndex, setRankIndex] = useState(0);

  // Update rank index when balance loads
  useEffect(() => {
    if (balance !== undefined) {
      setRankIndex(currentRank.tier);
    }
  }, [balance, currentRank.tier]);

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Temporarily hide the share button and redact address
      const shareButton = cardRef.current.querySelector('[data-share-button]') as HTMLElement;
      const addressElement = cardRef.current.querySelector('[data-citizen-id]') as HTMLElement;
      const originalAddress = addressElement?.textContent;

      if (shareButton) shareButton.style.display = 'none';
      if (addressElement && address) {
        // Redact middle portion - government style
        const visibleStart = address.slice(0, 6);
        const visibleEnd = address.slice(-4);
        const redactedMiddle = '█'.repeat(address.length - 10);
        const redacted = `${visibleStart}${redactedMiddle}${visibleEnd}`;
        addressElement.textContent = redacted;
      }

      // Generate canvas
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      // Restore original content
      if (shareButton) shareButton.style.display = '';
      if (addressElement && originalAddress) {
        addressElement.textContent = originalAddress;
      }

      // Convert to blob and share
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'department-of-cognition-id.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Department of Cognition - Official Credential',
            text: 'Official cognitive status verified. Intelligence authenticated by the Department of Cognition. Glory to the collective mind.',
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'department-of-cognition-id.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  // Get rank for display (default to tier 0 if not connected)
  const displayRank = isConnected ? currentRank : COGNITIVE_RANKS[0];
  const displayBalance = isConnected ? balanceNumber : 0;

  if (!isConnected) {
    return (
      <section id="wallet" className="container mx-auto px-4 py-8 md:py-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight">Department of Cognition</h2>
            </div>
            <p className="text-muted-foreground">
              Official Cognitive Status Report • Verification Pending
            </p>
          </div>

          <Card className="border-2 border-dashed border-muted">
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="space-y-3">
                  <div className="text-6xl">{displayRank.badge}</div>
                  <Badge variant="outline" className={`${displayRank.color}`}>
                    {displayRank.name}
                  </Badge>
                </div>
                <Separator className="my-6" />
                <div className="space-y-2">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Wallet Connection Required</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Connect your wallet to verify your cognitive credentials and access your official Department of Cognition status.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="wallet" className="container mx-auto px-4 py-16">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">Department of Cognition</h2>
          </div>
          <p className="text-muted-foreground">
            Official Cognitive Status Report • Citizen ID: {address?.slice(0, 10)}...{address?.slice(-8)}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Official ID Card */}
          <Card ref={cardRef} className="border-2 relative overflow-hidden h-[420px] md:h-[340px] flex flex-col">
            <DottedGlowBackground
              className="pointer-events-none absolute inset-0"
              opacity={0.25}
              gap={14}
              radius={1.2}
              colorLightVar="--color-neutral-400"
              glowColorLightVar="--color-neutral-500"
              colorDarkVar="--color-neutral-600"
              glowColorDarkVar="--color-neutral-700"
              backgroundOpacity={0.02}
              speedMin={0.2}
              speedMax={1.0}
              speedScale={0.8}
            />
            <div className="relative z-10 flex-1 flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="h-7 w-7 text-primary flex-shrink-0" />
                    <div>
                      <CardTitle className="text-xl leading-tight">Department of Cognition</CardTitle>
                      <CardDescription className="mt-1.5 text-xs">Official Credential</CardDescription>
                    </div>
                  </div>
                  <button
                    onClick={handleShare}
                    data-share-button
                    className="p-2 rounded-md hover:bg-muted transition-colors flex-shrink-0"
                    aria-label="Share ID card"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="py-8">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-20 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-48" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Citizen ID</p>
                      <p data-citizen-id className="font-mono text-sm break-all">{address}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Proof of Intelligence Coin Holdings</p>
                        <p className="text-4xl font-bold tabular-nums">
                          {formatPOICBalance(balanceNumber)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Cognitive Rank</p>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{currentRank.badge}</span>
                          <div>
                            <p className={`font-semibold ${currentRank.color}`}>
                              {currentRank.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Tier {currentRank.tier}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {balanceNumber === 0 && (
                      <>
                        <Separator />
                        <p className="text-xs text-muted-foreground">
                          Complete intelligence verification protocols to earn credentials and advance through ranks.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Rank Browser */}
          <Card className="border-2 h-[420px] md:h-[340px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cognitive Ranks</CardTitle>
                  <CardDescription>Browse all tiers</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRankIndex(Math.max(0, rankIndex - 1))}
                    disabled={rankIndex === 0}
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous rank"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                    {COGNITIVE_RANKS[rankIndex].tier} / {COGNITIVE_RANKS.length - 1}
                  </span>
                  <button
                    onClick={() => setRankIndex(Math.min(COGNITIVE_RANKS.length - 1, rankIndex + 1))}
                    disabled={rankIndex === COGNITIVE_RANKS.length - 1}
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next rank"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden justify-between">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-3">
                    <div className="h-16 bg-muted rounded mx-auto w-16" />
                    <div className="h-6 bg-muted rounded mx-auto w-48" />
                    <div className="h-4 bg-muted rounded mx-auto w-64" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <div className="text-5xl">
                      {balanceNumber >= COGNITIVE_RANKS[rankIndex].minBalance
                        ? COGNITIVE_RANKS[rankIndex].badge
                        : '🔒'}
                    </div>
                    <div>
                      <Badge
                        variant={currentRank.tier === COGNITIVE_RANKS[rankIndex].tier ? "default" : "outline"}
                        className={`${COGNITIVE_RANKS[rankIndex].color}`}
                      >
                        {COGNITIVE_RANKS[rankIndex].name}
                      </Badge>
                      {currentRank.tier === COGNITIVE_RANKS[rankIndex].tier && (
                        <p className="text-xs text-muted-foreground mt-1">Your current rank</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      "{COGNITIVE_RANKS[rankIndex].description}"
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {COGNITIVE_RANKS[rankIndex].maxBalance
                        ? `${formatPOICBalance(COGNITIVE_RANKS[rankIndex].minBalance)} - ${formatPOICBalance(COGNITIVE_RANKS[rankIndex].maxBalance)} POIC`
                        : `${formatPOICBalance(COGNITIVE_RANKS[rankIndex].minBalance)}+ POIC`
                      }
                    </p>
                  </div>

                  {/* Progress bar - only show for current rank */}
                  <div className="pt-3 border-t space-y-1">
                    {currentRank.tier === COGNITIVE_RANKS[rankIndex].tier && progressData.nextRank ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Next: {progressData.nextRank.name}</span>
                          <span className="font-medium">{Math.round(progressData.percentage)}%</span>
                        </div>
                        <Progress value={progressData.percentage} className="h-1.5" />
                      </>
                    ) : (
                      <div className="h-[28px]"></div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Department Notice */}
        <Card className="border-l-4 border-l-primary bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">DEPARTMENT NOTICE:</span> Your cognitive rank is
              calculated based on verified intelligence credentials (POIC tokens). Higher ranks
              grant elevated status within the collective mind. Continue proving your intelligence
              to advance through the ranks. Glory to the Department.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
