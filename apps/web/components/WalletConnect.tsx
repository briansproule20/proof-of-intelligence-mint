'use client';

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { Button } from './ui/button';
import { Wallet, Coins, Copy, Check, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/lib/contract';
import { formatUnits } from 'viem';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
  });

  // Get USDC balance (Base mainnet)
  const { data: usdcBalance } = useBalance({
    address: address,
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  });

  // Get POIC token balance
  const { data: poicBalance } = useBalance({
    address: address,
    token: CONTRACT_ADDRESS,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) {
    return (
      <Button disabled variant="outline" size="sm">
        <Wallet className="h-4 w-4" />
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            {/* Header */}
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Wallet</h4>
              <p className="text-xs text-muted-foreground">Manage your wallet and balances</p>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <button
                onClick={copyAddress}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted rounded-lg text-xs font-mono hover:bg-muted/80 transition-colors"
              >
                <span className="truncate">{address}</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            </div>

            {/* Balances */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Balances</label>
              <div className="space-y-2">
                {/* ETH Balance */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">ETH</span>
                  </div>
                  <span className="text-sm font-mono">
                    {ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0.0000'}
                  </span>
                </div>

                {/* USDC Balance */}
                <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">USDC</span>
                  </div>
                  <span className="text-sm font-mono text-green-700 dark:text-green-400">
                    {usdcBalance ? parseFloat(formatUnits(usdcBalance.value, 6)).toFixed(2) : '0.00'}
                  </span>
                </div>

                {/* POIC Balance */}
                <div className="flex items-center justify-between px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">POIC</span>
                  </div>
                  <span className="text-sm font-mono text-primary">
                    {poicBalance ? parseFloat(formatUnits(poicBalance.value, poicBalance.decimals)).toFixed(0) : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Disconnect Button */}
            <Button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              variant="outline"
              className="w-full gap-2"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Connect Wallet</h4>
            <p className="text-xs text-muted-foreground">Choose a wallet to connect</p>
          </div>
          <div className="space-y-2">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                onClick={() => {
                  connect({ connector });
                  setOpen(false);
                }}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Wallet className="h-4 w-4" />
                {connector.name}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
