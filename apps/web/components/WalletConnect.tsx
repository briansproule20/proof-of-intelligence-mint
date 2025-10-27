'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from './ui/button';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <Button disabled className="w-full" size="lg">
          <Wallet className="mr-2 h-4 w-4" />
          Loading...
        </Button>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-muted rounded-lg text-sm font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button onClick={() => disconnect()} variant="destructive" size="sm">
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="w-full"
          size="lg"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect {connector.name}
        </Button>
      ))}
    </div>
  );
}
