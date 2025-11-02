'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { TokenBalance } from '@/components/TokenBalance';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AnswerResponse, EchoQuestion } from '@poim/shared';
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';
import { wrapFetchWithPayment } from 'x402-fetch';

export default function PlayPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [question, setQuestion] = useState<EchoQuestion | null>(null);
  const [questionId, setQuestionId] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{ message: string; txHash?: string } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');

  const loadNextQuestion = () => {
    setSuccessData(null);
    setError('');
    setSelectedAnswer('');
    setQuestion(null); // Clear current question to show loader
    setQuestionId('');
    fetchQuestion();
  };

  // Fetch question only when wallet is connected
  useEffect(() => {
    if (isConnected && address && walletClient) {
      fetchQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, walletClient]);

  const fetchQuestion = async () => {
    try {
      console.log('[PlayPage] fetchQuestion called, address:', address);
      setIsLoading(true);
      setError('');

      if (!address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      console.log('[PlayPage] Requesting question via x402 (payment to server wallet)...');

      // Wrap fetch with x402 payment handling
      // Set maxValue to 2 USDC (2000000 in base units with 6 decimals) to allow 1.25 USDC payment
      const MAX_PAYMENT_USDC = BigInt(2_000_000); // 2 USDC in base units (6 decimals)
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any, MAX_PAYMENT_USDC);

      // Make payment-required request to server
      // This will trigger the x402 middleware to collect 1.25 USDC payment to server wallet
      // Use absolute URL for x402-fetch
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const url = `${baseUrl}/api/x402/question?userId=${address}&difficulty=medium`;

      console.log('[PlayPage] Fetching from URL:', url);

      const response = await fetchWithPayment(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch question: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PlayPage] Received question from server:', data);

      // Server returns { question, _meta: { correctAnswer, explanation } }
      setQuestion(data.question);
      setQuestionId(data.question.id);

      // Store correct answer locally for verification
      // In production, you'd want to store this server-side in a database
      if (data._meta && data._meta.correctAnswer) {
        setCorrectAnswer(data._meta.correctAnswer);

        // Store on server for verification
        const storeResponse = await fetch('/api/question/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: data.question,
            correctAnswer: data._meta.correctAnswer,
          }),
        });

        if (!storeResponse.ok) {
          console.warn('[PlayPage] Failed to store question on server (continuing anyway)');
        }
      }

    } catch (err: any) {
      console.error('[PlayPage] Failed to fetch question:', err);

      // Check for payment-related errors
      if (err.message.includes('402') || err.message.includes('Payment')) {
        setError('Payment required: Please approve the 1.25 USDC payment to get a question. Make sure you have enough USDC in your wallet.');
      } else if (err.message.includes('rejected') || err.message.includes('denied')) {
        setError('Transaction rejected: You need to approve the payment to generate a question.');
      } else {
        setError(err.message || 'Failed to load question. Please try again.');
      }
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
                  <span>Pay 1.25 USDC: $1.00 to LP, $0.25 for gas + LLM</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Answer correctly to earn 5000 POIC</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>LP pool grows with each question</span>
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
        ) : !isConnected ? (
          /* Wallet Not Connected State */
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Connect Your Wallet to Play</h3>
                  <p className="text-muted-foreground">
                    You need a connected wallet to pay for questions (1.25 USDC via x402) and receive POIC tokens when you answer correctly.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <WalletConnect />
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
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
                  <Button onClick={fetchQuestion} variant="outline" disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Get Question'}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
