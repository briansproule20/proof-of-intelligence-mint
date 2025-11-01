import { z } from 'zod';

// Echo Types
export const EchoQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export type EchoQuestion = z.infer<typeof EchoQuestionSchema>;

export const EchoAnswerVerificationSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  userId: z.string(),
});

export type EchoAnswerVerification = z.infer<typeof EchoAnswerVerificationSchema>;

// Mint Types
export const MintPermitSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.string(), // BigInt as string
  nonce: z.string(), // BigInt as string
  deadline: z.number().int().positive(),
});

export type MintPermit = z.infer<typeof MintPermitSchema>;

export const MintSignatureResponseSchema = z.object({
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature format'),
  permit: MintPermitSchema,
});

export type MintSignatureResponse = z.infer<typeof MintSignatureResponseSchema>;

// API Request/Response Types

// GET /question - returns question or 402 with payment info
export const QuestionResponseSchema = z.discriminatedUnion('requiresPayment', [
  z.object({
    requiresPayment: z.literal(false),
    question: EchoQuestionSchema,
  }),
  z.object({
    requiresPayment: z.literal(true),
    paymentAmount: z.string(), // Wei amount
    paymentRecipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    message: z.string(),
  }),
]);

export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;

// POST /answer/:id with Payment header
export const AnswerRequestSchema = z.object({
  answer: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;

export const AnswerResponseSchema = z.discriminatedUnion('correct', [
  z.object({
    correct: z.literal(true),
    message: z.string(),
    txHash: z.string().optional(),
    usdcTxHash: z.string().optional(),
    error: z.string().optional(),
  }),
  z.object({
    correct: z.literal(false),
    message: z.string(),
    error: z.string().optional(),
  }),
]);

export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;

// Contract Types
export const ContractConfigSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive(),
});

export type ContractConfig = z.infer<typeof ContractConfigSchema>;

// User Session Types
export const UserSessionSchema = z.object({
  id: z.string(),
  echoToken: z.string(),
  email: z.string().email().optional(),
  createdAt: z.number(),
});

export type UserSession = z.infer<typeof UserSessionSchema>;
