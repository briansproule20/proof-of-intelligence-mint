'use client';

import { useAccount, useReadContract } from 'wagmi';
import { POIC_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { formatUnits } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Coins, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    Math.floor(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export function TokenBalance({ onMintSuccess }: { onMintSuccess?: boolean }) {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: balance, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: POIC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && mounted,
    },
  });

  // Update display balance when balance changes
  useEffect(() => {
    if (balance) {
      const newBalance = Number(formatUnits(balance, 18));
      setDisplayBalance(newBalance);
    }
  }, [balance]);

  // Trigger animation when mint succeeds
  useEffect(() => {
    if (onMintSuccess) {
      setShowPulse(true);
      // IMMEDIATELY increment by 5000 for instant dopamine hit
      setDisplayBalance(prev => prev + 5000);
      // Refetch real balance after animation completes
      setTimeout(() => {
        refetch();
      }, 2000);
      // Reset pulse after animation
      setTimeout(() => {
        setShowPulse(false);
      }, 2500);
    }
  }, [onMintSuccess, refetch]);

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
          <div className="text-muted-foreground text-sm">
            Connect wallet to view balance
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      animate={showPulse ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          '0 0 0 0 rgba(var(--primary), 0)',
          '0 0 0 10px rgba(var(--primary), 0.2)',
          '0 0 0 0 rgba(var(--primary), 0)',
        ],
      } : {}}
      transition={{ duration: 0.6 }}
    >
      <Card className={showPulse ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={showPulse ? { rotate: [0, 360] } : {}}
              transition={{ duration: 0.6 }}
            >
              <Coins className="h-5 w-5" />
            </motion.div>
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
              <span className="tabular-nums">
                <AnimatedNumber value={displayBalance} /> POIC
              </span>
            )}
          </div>
          {showPulse && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2"
            >
              +5,000 POIC minted! 🎉
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
