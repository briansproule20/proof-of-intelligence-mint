// Chain IDs
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
  LOCALHOST: 31337,
} as const;

// Token configuration
export const TOKEN_DECIMALS = 18;
export const MINT_AMOUNT = '5000000000000000000000'; // 5000 tokens in wei
export const MAX_MINT_COUNT = 100000; // Maximum number of mints before LP creation

// USDC configuration (Base Mainnet)
export const USDC_ADDRESS_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;
export const PAYMENT_AMOUNT = '1250000'; // 1.25 USDC with 6 decimals (user pays this)
export const LP_CONTRIBUTION = '1000000'; // 1.00 USDC with 6 decimals (forwarded to LP pool)
export const SERVER_FEE = '250000'; // 0.25 USDC with 6 decimals (kept by server for gas + LLM)

// Signature expiry (15 minutes)
export const SIGNATURE_VALIDITY_SECONDS = 15 * 60;

// API endpoints
export const API_ENDPOINTS = {
  GET_QUESTION: '/api/question',
  ANSWER_QUESTION: '/api/answer',
} as const;

// HTTP 402 Payment Required
export const QUESTION_MINT_FEE = '1000000000000000000'; // 1 POIC token as fee (in wei)

// Echo configuration
export const ECHO_CONFIG = {
  API_BASE_URL: 'https://api.echo.merit.systems',
  AUTH_URL: 'https://echo.merit.systems',
} as const;
