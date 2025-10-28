'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wallet, Brain, Coins, ArrowRight, CheckCircle2 } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">POIM</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <WalletConnect />
            <Button asChild size="sm" className="hidden md:flex">
              <Link href="/play">Launch App</Link>
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
            Prove Your Intelligence,
            <span className="text-primary"> Mint Rewards</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Answer trivia questions and mint POIC tokens on Base Sepolia. Pay only gas fees, earn tokens for correct answers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/play">
                Start Playing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why POIM?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A seamless blend of trivia, blockchain, and rewards
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Payment Required</h3>
              <p className="text-sm text-muted-foreground">
                Only pay network gas fees. The mint itself serves as the access fee via HTTP 402.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Echo Powered</h3>
              <p className="text-sm text-muted-foreground">
                Questions and verification managed by Echo Merit Systems' trusted infrastructure.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Base Sepolia</h3>
              <p className="text-sm text-muted-foreground">
                Built on Base testnet for fast, cheap, and secure transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl my-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Three simple steps to earn tokens</p>
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
                  Connect using Coinbase Smart Wallet (recommended for gas sponsorship), MetaMask, or WalletConnect.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Answer Questions</h3>
                </div>
                <p className="text-muted-foreground">
                  Answer trivia questions powered by Echo's question system. Get it right to unlock minting.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Mint Your Tokens</h3>
                </div>
                <p className="text-muted-foreground">
                  Receive a signed authorization and mint 1 POIC token. Pay only gas fees on Base.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl mb-2">Ready to Get Started?</CardTitle>
            <CardDescription className="text-lg">
              Connect your wallet and start earning POIC tokens today
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/play">
                <Sparkles className="h-4 w-4" />
                Launch App
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <a href="https://www.merit.systems/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Sparkles className="h-4 w-4" />
              <span>Built with Merit Systems</span>
            </a>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="https://echo.merit.systems/docs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Echo Docs
              </a>
              <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Base Docs
              </a>
              <a href="https://github.com/briansproule20/proof-of-intelligence-mint" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
