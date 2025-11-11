import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, ExternalLink, Zap, TrendingUp } from 'lucide-react';

export default function IntelligenceMiner() {
  return (
    <section id="intelligence-miner" className="container mx-auto px-4 py-8 md:py-12 bg-muted/30 rounded-3xl my-6 md:my-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/intel-miner.png"
              alt="Intelligence Miner Agent"
              width={180}
              height={180}
              className="rounded-full border-4 border-primary/20"
            />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight">
            Automated Cognitive Excellence Program
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Department-Approved Intelligence Automation
          </p>
        </div>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Bot className="h-6 w-6 text-primary" />
              The Intelligence Miner Agent
            </CardTitle>
            <CardDescription className="text-base">
              Why risk human error when silicon can think for you?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
              <p>
                The Department of Cognition is pleased to announce our latest advancement in cognitive automation: the <span className="font-semibold text-foreground">Intelligence Miner Agent</span>.
              </p>
              <p>
                This state-approved x402 agent has been specifically calibrated to maximize your Proof of Intelligence score while minimizing the inefficiencies of manual thought. Simply deploy the agent, and watch as it answers questions with silicon precision—achieving a 100% success rate that would be impossible through mere human cognition.
              </p>
              <p>
                Perfect for the productivity-minded citizen who values <span className="italic">certainty over struggle</span>. Your POIC tokens flow directly to your wallet while you focus on other Department-approved activities. The agent pays the standard 1.25 USDC fee per question and receives the full 5000 POIC reward—all while you maintain plausible deniability about your natural intelligence levels.
              </p>
              <p className="font-semibold text-foreground pt-2">
                The Department thanks you for outsourcing your cognitive burden.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm mb-1">Automated Mining</div>
                  <div className="text-xs text-muted-foreground">Continuous POIC accumulation without human intervention</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm mb-1">100% Accuracy</div>
                  <div className="text-xs text-muted-foreground">Silicon intelligence exceeds biological limitations</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm mb-1">x402 Powered</div>
                  <div className="text-xs text-muted-foreground">Autonomous agent infrastructure on Base</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button asChild size="lg" className="gap-2 flex-1">
                <Link href="https://www.x402scan.com/composer/agent/aa412a04-b0f5-4309-ab85-65b6a3da7b09" target="_blank" rel="noopener noreferrer">
                  <Bot className="h-4 w-4" />
                  Deploy Intelligence Miner
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 flex-1">
                <Link href="https://www.x402scan.com/server/d256f9e6-3dcc-4320-b3ae-036f943e685d" target="_blank" rel="noopener noreferrer">
                  Proof of Intelligence Mint on x402scan
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground pt-4 border-t">
              <p>Authorized by the Department of Cognition • Powered by x402 Protocol on Base</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
