'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { TokenBalance } from '@/components/TokenBalance';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QuestionResponse, AnswerResponse, EchoQuestion } from '@poim/shared';
import { POIC_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';

export default function PlayPage() {
  const { address, isConnected } = useAccount();
  const [question, setQuestion] = useState<EchoQuestion | null>(null);
  const [questionId, setQuestionId] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mintData, setMintData] = useState<AnswerResponse | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<QuestionResponse | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Fetch question on mount
  useEffect(() => {
    if (isConnected) {
      fetchQuestion();
    }
  }, [isConnected]);

  // Reset when transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      setMintData(null);
      setSelectedAnswer('');
      fetchQuestion();
    }
  }, [isSuccess]);

  const fetchQuestion = async () => {
    try {
      setIsLoading(true);
      setError('');
      setRequiresPayment(false);

      const response = await fetch(`/api/question?userId=${address}`);
      const data: QuestionResponse = await response.json();

      if (data.requiresPayment) {
        setRequiresPayment(true);
        setPaymentInfo(data);
      } else {
        setQuestion(data.question);
        setQuestionId(data.question.id);
      }
    } catch (err) {
      setError('Failed to load question');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !questionId || !address) return;

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
        setMintData(data);
      } else {
        setError(data.message || 'Incorrect answer. Try again!');
        // Fetch new question after wrong answer
        setTimeout(() => {
          setSelectedAnswer('');
          fetchQuestion();
        }, 2000);
      }
    } catch (err) {
      setError('Failed to verify answer');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = () => {
    if (!mintData || !mintData.correct) return;

    const { permit, signature } = mintData.mintSignature;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: POIC_ABI,
      functionName: 'mintWithSig',
      args: [
        permit.to as `0x${string}`,
        BigInt(permit.amount),
        BigInt(permit.nonce),
        BigInt(permit.deadline),
        signature as `0x${string}`,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold mt-4">Connect to Play</h1>
            <p className="text-muted-foreground mt-2">Connect your wallet to start answering questions</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <WalletConnect />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Answer correctly to mint 1 POIC</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Pay only network gas fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Get a new question each round</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Payment Required State */}
        {requiresPayment && paymentInfo && paymentInfo.requiresPayment ? (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>Payment Required</CardTitle>
              <CardDescription>{paymentInfo.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                To continue playing, you need to mint POIC tokens. The mint fee serves as payment for accessing questions.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={fetchQuestion} className="w-full">
                I've Made Payment - Continue
              </Button>
            </CardFooter>
          </Card>
        ) : mintData && mintData.correct ? (
          /* Success State */
          <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-6 w-6" />
                Correct Answer!
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-500">
                You've earned the right to mint 1 POIC token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground mb-1">Token Amount</div>
                <div className="text-2xl font-bold">1 POIC</div>
              </div>
              {hash && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Transaction</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${hash}`}
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
            <CardFooter>
              <Button
                onClick={handleMint}
                disabled={isPending || isConfirming}
                size="lg"
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approve in Wallet...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting Token...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Mint Token
                  </>
                )}
              </Button>
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
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                      <XCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
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
                    ) : (
                      'Submit Answer'
                    )}
                  </Button>
                </CardFooter>
              </>
            ) : (
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="text-destructive font-medium">Failed to load question</p>
                  <Button onClick={fetchQuestion} variant="outline">
                    Try Again
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
