'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { TokenBalance } from '@/components/TokenBalance';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QuestionResponse, AnswerResponse, EchoQuestion } from '@poim/shared';
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';

export default function PlayPage() {
  const { address, isConnected } = useAccount();
  const [question, setQuestion] = useState<EchoQuestion | null>(null);
  const [questionId, setQuestionId] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{ message: string; txHash?: string } | null>(null);

  const loadNextQuestion = () => {
    setSuccessData(null);
    setError('');
    setSelectedAnswer('');
    setQuestion(null); // Clear current question to show loader
    setQuestionId('');
    fetchQuestion();
  };

  // Fetch question when component mounts (no wallet required for questions)
  useEffect(() => {
    fetchQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuestion = async () => {
    try {
      console.log('[PlayPage] fetchQuestion called, address:', address);
      setIsLoading(true);
      setError('');

      const userId = address || 'anonymous';

      console.log('[PlayPage] Fetching question from API...');

      // TEMPORARY: Questions are free for users while we debug x402
      // Backend still pays Echo for AI generation via createX402OpenAI
      const response = await fetch(`/api/question?userId=${userId}`);
      console.log('[PlayPage] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch question');
      }

      const data: QuestionResponse = await response.json();
      console.log('[PlayPage] Received data:', data);

      if (!data.requiresPayment) {
        setQuestion(data.question);
        setQuestionId(data.question.id);
      }
    } catch (err: any) {
      console.error('[PlayPage] Failed to fetch question:', err);
      setError(err.message || 'Failed to load question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !questionId || !question) return;

    // Wallet only needed for minting, not for answering
    if (!address) {
      setError('Connect wallet to submit answer and mint tokens');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/answer/${questionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: selectedAnswer,
          walletAddress: address,
        }),
      });

      const data: AnswerResponse = await response.json();

      if (data.correct) {
        setSuccessData({
          message: data.message || 'Tokens minted to your wallet!',
          txHash: data.txHash,
        });
      } else {
        setError(data.message || 'Incorrect answer. Try again!');
      }
    } catch (err) {
      setError('Failed to verify answer');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-4 w-4" />
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-bold">POIM</span>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TokenBalance />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Game Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Pay 1 USDC per question (via x402)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Answer correctly to earn 5000 POIC</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>USDC collected for Uniswap V4 LP pool</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>100k mints → Auto LP creation</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {successData ? (
          /* Success State */
          <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-6 w-6" />
                Correct Answer!
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-500">
                {successData.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground mb-1">Token Amount</div>
                <div className="text-2xl font-bold">5000 POIC</div>
              </div>
              {successData.txHash && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Transaction</span>
                  <a
                    href={`https://basescan.org/tx/${successData.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    View on Basescan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button
                onClick={loadNextQuestion}
                variant="default"
                className="flex-1"
              >
                Load Next Question
              </Button>
              {address && (
                <Button
                  onClick={() => window.open(`https://basescan.org/address/${address}`, '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  View Wallet
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : (
          /* Question State */
          <Card className="border-2">
            {isLoading && !question ? (
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading your question...</p>
                </div>
              </CardContent>
            ) : question ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      Question #{questionId.slice(-6)}
                    </span>
                    {question.difficulty && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                        {question.difficulty}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl md:text-2xl">{question.question}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                    <div className="space-y-3">
                      {question.options.map((option, index) => (
                        <div key={index} className="relative">
                          <RadioGroupItem
                            value={option}
                            id={`option-${index}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`option-${index}`}
                            className="flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                          >
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary">
                              <div className="w-2 h-2 rounded-full bg-primary-foreground opacity-0 peer-data-[state=checked]:opacity-100" />
                            </div>
                            <span className="flex-1">{option}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  {error && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                        <XCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </div>
                      <Button
                        onClick={loadNextQuestion}
                        variant="outline"
                        size="lg"
                        className="w-full"
                      >
                        Try Next Question
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  {!error && (
                    <>
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer || isLoading}
                        size="lg"
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking Answer...
                          </>
                        ) : !isConnected ? (
                          'Connect Wallet to Submit'
                        ) : (
                          'Submit Answer'
                        )}
                      </Button>
                      {!isConnected && (
                        <p className="text-xs text-muted-foreground text-center">
                          You'll need to connect your wallet to submit answers and mint tokens
                        </p>
                      )}
                    </>
                  )}
                </CardFooter>
              </>
            ) : (
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="text-destructive font-medium">
                    {error || 'Failed to load question'}
                  </p>
                  {!isConnected ? (
                    <p className="text-sm text-muted-foreground text-center">
                      Connect your wallet to get questions
                    </p>
                  ) : (
                    <Button onClick={fetchQuestion} variant="outline" disabled={isLoading}>
                      {isLoading ? 'Loading...' : 'Get Question'}
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
