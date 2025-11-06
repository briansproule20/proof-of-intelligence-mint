'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wallet, Brain, Coins, ArrowRight, CheckCircle2 } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';
import { TokenStats } from '@/components/TokenStats';
import DepartmentOfCognitionWallet from '@/components/DepartmentOfCognitionWallet';
import { useAccount } from 'wagmi';

export default function HomePage() {
  const { isConnected } = useAccount();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/poic-favicon.png"
              alt="POIC Coin"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-bold text-xl">POIM</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#about" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Lore
            </Link>
            <Link href="#wallet" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Wallet
            </Link>
            <Link href="#launch" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Launch
            </Link>
            <Link href="#how-it-works" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Rules
            </Link>
            <WalletConnect />
            <Button asChild={isConnected} size="sm" className="hidden md:flex" disabled={!isConnected}>
              {isConnected ? (
                <Link href="/play">Play Game</Link>
              ) : (
                <span>Play Game</span>
              )}
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Powered by x402 on Base
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Proof of Intelligence Mint
          </h1>

          <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
            Prove Your Intelligence, Mint Rewards
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Answer AI-powered trivia questions on Base. Pay 1.25 USDC per question via x402, mint 5000 POIC tokens for correct answers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild={isConnected} size="lg" className="gap-2" disabled={!isConnected}>
              {isConnected ? (
                <Link href="/play">
                  Start Playing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  Start Playing
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="container mx-auto px-4 py-12 md:py-20 bg-muted/30 rounded-3xl my-8 md:my-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-8 tracking-tight">
              Incoming Message from the Department of Cognition
            </h2>
          </div>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>
              Following the Great Cognitive Collapse, humanity was reorganized under the Department of Cognition, a proud, benevolent institution dedicated to regulating all thinking activities.
            </p>
            <p>
              Every citizen now serves the Collective Mind by participating in the Proof of Intelligence Program, where your loyalty, intellect, and reflexes are measured through state-approved trivia.
            </p>
            <p>
              Each day, billions proudly log in to demonstrate their civic intelligence. Answer correctly and you'll earn Proof of Intelligence Coins™, the state's highest form of self-esteem! Fail too many questions and you'll enjoy a relaxing stay at one of our Re-Calibration Resorts, where thinking is temporarily suspended for your safety.
            </p>
            <p>
              Congratulations, citizen! Your intelligence is now a publicly traded asset. Each correct answer strengthens our Collective Mind and increases your market value.
            </p>
            <p className="font-semibold pt-6 text-foreground">
              Remember: Your mind is property of the public good.
            </p>
          </div>
        </div>
      </section>

      {/* Department of Cognition Wallet Section */}
      <DepartmentOfCognitionWallet />

      {/* Token Stats Section - Real-time blockchain data */}
      <TokenStats />


      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-12 md:py-20 bg-muted/30 rounded-3xl my-8 md:my-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Four simple steps to earn tokens</p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Connect Your Wallet</h3>
                </div>
                <p className="text-muted-foreground">
                  Use Coinbase Smart Wallet, MetaMask, or any WalletConnect-compatible wallet. You'll need USDC on Base to play.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Pay for a Question</h3>
                </div>
                <p className="text-muted-foreground">
                  Each question costs 1.25 USDC via x402: $1.00 builds the LP pool, $0.25 covers gas and AI generation fees.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Answer the AI Question</h3>
                </div>
                <p className="text-muted-foreground">
                  Get a unique trivia question generated by Claude Sonnet 4.5. Choose from 4 multiple-choice options and submit your answer.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Mint Your Tokens</h3>
                </div>
                <p className="text-muted-foreground">
                  Answer correctly to instantly mint 5000 POIC tokens to your wallet. After 100k mints, the LP pool auto-launches on Uniswap V4.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl mb-2">Ready to Get Started?</CardTitle>
            <CardDescription className="text-lg">
              Connect your wallet and start earning POIC tokens today
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild={isConnected} size="lg" className="gap-2" disabled={!isConnected}>
              {isConnected ? (
                <Link href="/play">
                  <Sparkles className="h-4 w-4" />
                  Play Game
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Play Game
                </span>
              )}
            </Button>
            {!isConnected && (
              <p className="text-sm text-muted-foreground">
                Connect your wallet to start playing
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-12 md:mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-6">
            <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              x402 Protocol
            </a>
            <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Base Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
