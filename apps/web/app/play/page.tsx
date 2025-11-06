'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useConfig } from 'wagmi';
import { getWalletClient } from '@wagmi/core';
import { base } from 'wagmi/chains';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { WalletConnect } from '@/components/WalletConnect';
import { TokenBalance } from '@/components/TokenBalance';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AnswerResponse, EchoQuestion } from '@poim/shared';
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';
import { wrapFetchWithPayment, Signer } from 'x402-fetch';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';
import { PaymentRequirementsSchema } from 'x402/types';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function PlayPage() {
  const { address, isConnected, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const config = useConfig();
  const router = useRouter();
  const [question, setQuestion] = useState<EchoQuestion | null>(null);
  const [questionId, setQuestionId] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{ message: string; txHash?: string; usdcTxHash?: string } | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);

  const loadNextQuestion = () => {
    setSuccessData(null);
    setError('');
    setSelectedAnswer('');
    setMintSuccess(false);
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
      console.log('[PlayPage] fetchQuestion called, address:', address, 'walletClient:', !!walletClient);
      setIsLoading(true);
      setError('');

      if (!address) {
        throw new Error('No wallet address');
      }

      // Get wallet client - try hook first, fallback to connector
      let activeWalletClient = walletClient;

      if (!activeWalletClient && connector) {
        console.log('[PlayPage] WalletClient from hook is null, trying connector...');
        try {
          // Don't specify chainId - let it use whatever chain the wallet is on
          const connectorClient = await getWalletClient(config, { connector });
          console.log('[PlayPage] Got client from connector:', !!connectorClient);
          activeWalletClient = connectorClient as any;
        } catch (err) {
          console.error('[PlayPage] Failed to get client from connector:', err);
        }
      }

      if (!activeWalletClient) {
        console.log('[PlayPage] No wallet client available - stopping');
        setIsLoading(false);
        setError('Wallet not ready. Please disconnect and reconnect your wallet.');
        return;
      }

      // FORCE chain to Base if not set
      if (!activeWalletClient.chain) {
        console.log('[PlayPage] Wallet client missing chain, forcing Base');
        activeWalletClient = { ...activeWalletClient, chain: base };
      }

      console.log('[PlayPage] Requesting question via x402 (payment to server wallet)...');
      console.log('[PlayPage] Using wallet client:', {
        fromHook: !!walletClient,
        hasAccount: !!activeWalletClient?.account,
        accountAddress: activeWalletClient?.account?.address,
        hasChain: !!activeWalletClient?.chain,
        chainId: activeWalletClient?.chain?.id,
      });

      // Wrap fetch with x402 payment handling (pattern from shirt.sh)
      // Note: Coinbase wallet has viem compatibility issues, use "as unknown as Signer" cast
      // maxValue: 2 USDC (2000000 in 6 decimals) to allow 1.25 USDC payment
      const MAX_PAYMENT_USDC = BigInt(2_000_000);

      console.log('[PlayPage] Creating wrapped fetch with max value:', MAX_PAYMENT_USDC.toString());
      console.log('[PlayPage] Wallet client details:', {
        type: typeof activeWalletClient,
        hasAccount: !!activeWalletClient?.account,
        hasChain: !!activeWalletClient?.chain,
        chainId: activeWalletClient?.chain?.id,
        chainName: activeWalletClient?.chain?.name,
        hasSignTypedData: typeof activeWalletClient?.signTypedData,
        hasRequest: typeof activeWalletClient?.request,
        hasWriteContract: typeof activeWalletClient?.writeContract,
        hasSignMessage: typeof activeWalletClient?.signMessage,
      });

      // CRITICAL DEBUG: Check if x402 can recognize this wallet
      console.log('[PlayPage] Testing x402 wallet detection...');
      const signerForDebug = activeWalletClient as unknown as Signer;
      console.log('[PlayPage] Signer cast complete');

      const fetchWithPayment = wrapFetchWithPayment(
        fetch,
        signerForDebug,
        MAX_PAYMENT_USDC
      );
      console.log('[PlayPage] Wrapped fetch created successfully');

      // Make payment-required request to server
      // This will trigger the x402 middleware to collect 1.25 USDC payment to server wallet
      // Use absolute URL for x402-fetch
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const url = `${baseUrl}/api/x402/question?userId=${address}&difficulty=medium`;

      console.log('[PlayPage] Fetching from URL:', url);

      let response;
      try {
        console.log('[PlayPage] Calling fetchWithPayment...');
        console.log('[PlayPage] Request URL:', url);
        console.log('[PlayPage] Request init:', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // MANUAL PAYMENT HEADER CREATION FOR DEBUGGING
        // First, make initial request to get 402
        const initialResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('[PlayPage] Initial response status:', initialResponse.status);

        if (initialResponse.status === 402) {
          console.log('[PlayPage] Got 402, processing payment...');
          const paymentData = await initialResponse.json();
          console.log('[PlayPage] Payment data:', paymentData);

          const { x402Version, accepts } = paymentData;
          console.log('[PlayPage] x402Version:', x402Version);
          console.log('[PlayPage] accepts:', accepts);

          // Parse payment requirements
          const parsedPaymentRequirements = accepts.map((x: any) => PaymentRequirementsSchema.parse(x));
          console.log('[PlayPage] Parsed payment requirements:', parsedPaymentRequirements);

          // Select payment requirements (this should match x402-fetch logic)
          const selectedPaymentRequirements = selectPaymentRequirements(
            parsedPaymentRequirements,
            'base', // Force base network
            'exact'
          );
          console.log('[PlayPage] Selected payment requirements:', selectedPaymentRequirements);

          // Check payment amount
          const paymentAmount = BigInt(selectedPaymentRequirements.maxAmountRequired);
          console.log('[PlayPage] Payment amount:', paymentAmount.toString());
          console.log('[PlayPage] Max allowed:', MAX_PAYMENT_USDC.toString());

          if (paymentAmount > MAX_PAYMENT_USDC) {
            throw new Error(`Payment amount ${paymentAmount} exceeds maximum allowed ${MAX_PAYMENT_USDC}`);
          }

          // Try to create payment header manually
          console.log('[PlayPage] Creating payment header manually...');
          console.log('[PlayPage] Signer type:', typeof signerForDebug);
          console.log('[PlayPage] Signer:', signerForDebug);

          let paymentHeader;
          try {
            paymentHeader = await createPaymentHeader(
              signerForDebug,
              x402Version,
              selectedPaymentRequirements
            );
            console.log('[PlayPage] Payment header created successfully!');
            console.log('[PlayPage] Payment header length:', paymentHeader?.length || 0);
            console.log('[PlayPage] Payment header preview:', paymentHeader?.substring(0, 100));
          } catch (headerErr: any) {
            console.error('[PlayPage] FAILED to create payment header:', {
              message: headerErr.message,
              stack: headerErr.stack,
              cause: headerErr.cause,
              fullError: headerErr,
            });
            throw new Error(`Payment header creation failed: ${headerErr.message}`);
          }

          // Make second request with payment header
          console.log('[PlayPage] Making second request with payment header...');
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-PAYMENT': paymentHeader,
            },
          });
          console.log('[PlayPage] Second response status:', response.status);
        } else {
          response = initialResponse;
        }

        console.log('[PlayPage] fetchWithPayment returned successfully');
      } catch (err: any) {
        console.error('[PlayPage] fetchWithPayment threw error during payment processing:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          cause: err.cause,
          fullError: err,
        });

        // Check if it's a specific x402 error
        if (err.message?.includes('Payment amount exceeds')) {
          throw new Error('Payment amount exceeds maximum allowed. Contact support.');
        }
        if (err.message?.includes('Payment already attempted')) {
          throw new Error('Payment retry detected. Please refresh and try again.');
        }
        if (err.message?.includes('createPaymentHeader')) {
          throw new Error(`Payment header creation failed: ${err.message}. This may be a wallet compatibility issue.`);
        }

        throw err;
      }

      console.log('[PlayPage] Received response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      // If 402, this means the x402-fetch wrapper FAILED to process payment
      // It should have automatically handled the 402, created payment header, and retried
      if (response.status === 402) {
        console.error('[PlayPage] ⚠️  CRITICAL: 402 response returned - payment was NOT processed!');
        console.error('[PlayPage] This means wrapFetchWithPayment failed to create payment header');
        console.log('[PlayPage] Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.clone().text();
        console.log('[PlayPage] 402 Response body:', responseText);

        try {
          const responseJson = JSON.parse(responseText);
          console.log('[PlayPage] 402 Response JSON:', responseJson);
          console.error('[PlayPage] Expected payment amount:', responseJson.accepts?.[0]?.maxAmountRequired);
          console.error('[PlayPage] Payment destination:', responseJson.accepts?.[0]?.payTo);
        } catch (e) {
          console.log('[PlayPage] Response is not JSON');
        }

        throw new Error('Payment processing failed - x402-fetch did not create payment header. Check wallet compatibility.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch question: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PlayPage] Received question from server:', data);

      // Server returns { id, question, options, difficulty }
      // Correct answer is stored in Supabase (not exposed to client)
      setQuestion(data);
      setQuestionId(data.id);

    } catch (err: any) {
      console.error('[PlayPage] Failed to fetch question:', err);
      console.error('[PlayPage] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause,
      });

      // Check for payment-related errors
      if (err.message.includes('402') || err.message.includes('Payment')) {
        setError('Payment required: Please approve the 1.25 USDC payment to get a question. Make sure you have enough USDC in your wallet.');
      } else if (err.message.includes('rejected') || err.message.includes('denied')) {
        setError('Transaction rejected: You need to approve the payment to generate a question.');
      } else if (err.message.includes('User rejected') || err.message.includes('User denied')) {
        setError('You cancelled the payment. Please try again when ready.');
      } else if (err.message.includes('insufficient funds')) {
        setError('Insufficient USDC balance. You need at least 1.25 USDC on Base network.');
      } else {
        setError(`Error: ${err.message || 'Failed to load question. Please check console for details.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !questionId || !question || !address) return;

    try {
      setIsLoading(true);
      setError('');

      // New unified API: verify answer and mint tokens in one call
      // SECURITY: Don't send wallet address - server looks it up from question.user_id
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          answer: selectedAnswer,
        }),
      });

      const data: AnswerResponse = await response.json();

      if (data.correct) {
        // Correct answer! Tokens minted automatically
        // Trigger balance animation
        setMintSuccess(true);

        // Subtle confetti celebration
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#FFD700', '#FFA500'],
          scalar: 0.8,
        });

        setSuccessData({
          message: data.message || 'Tokens minted to your wallet!',
          txHash: data.txHash,
          usdcTxHash: data.usdcTxHash,
        });
      } else {
        // Incorrect answer
        setError(data.message || 'Incorrect answer. Try again!');
      }
    } catch (err) {
      setError('Failed to submit answer');
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
              <Image
                src="/poic-favicon.png"
                alt="POIC Coin"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-bold">POIM</span>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TokenBalance onMintSuccess={mintSuccess} />

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
          /* Success State - Minimalistic */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <Card className="border-2 border-green-500/50">
              <CardContent className="py-12">
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10"
                  >
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </motion.div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Tokens Minted!</h3>
                    <p className="text-muted-foreground">{successData.message}</p>
                  </div>

                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/10 border border-green-500/20"
                  >
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <span className="text-xl font-bold">5,000 POIC</span>
                  </motion.div>

                  {successData.txHash && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <a
                        href={`https://basescan.org/tx/${successData.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View on Basescan
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-3 pt-4"
                  >
                    <Button
                      onClick={loadNextQuestion}
                      size="lg"
                      className="flex-1"
                    >
                      Next Question
                    </Button>
                    {address && (
                      <Button
                        onClick={() => {
                          // Reset game state and navigate to wallet section
                          setSuccessData(null);
                          setError('');
                          setSelectedAnswer('');
                          setQuestion(null);
                          setQuestionId('');
                          router.push('/#wallet');
                        }}
                        variant="outline"
                        size="lg"
                        className="flex-1"
                      >
                        View Wallet
                      </Button>
                    )}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
                  {!error && !successData ? (
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
                            Verifying & Minting...
                          </>
                        ) : !isConnected ? (
                          'Connect Wallet to Submit'
                        ) : (
                          'Submit Answer & Mint'
                        )}
                      </Button>
                      {!isConnected && (
                        <p className="text-xs text-muted-foreground text-center">
                          You'll need to connect your wallet to submit answers and mint tokens
                        </p>
                      )}
                    </>
                  ) : null}
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
