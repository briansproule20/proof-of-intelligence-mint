/**
 * POIC Ranking System
 * Department of Cognition - Citizen Classification Protocol
 *
 * Dystopian ranking system for Proof of Intelligence Coin holders
 */

export interface CognitiveRank {
  tier: number;
  name: string;
  minBalance: number;
  maxBalance: number | null;
  description: string;
  color: string; // Tailwind color class
  badge: string; // Emoji or symbol
}

/**
 * Cognitive Rank Tiers
 * Department of Cognition - Official Citizen Classification System
 * Helldivers 2-inspired dystopian bureaucratic satire
 */
export const COGNITIVE_RANKS: CognitiveRank[] = [
  {
    tier: 0,
    name: 'Unverified Consciousness',
    minBalance: 0,
    maxBalance: 0,
    description: 'Your cognitive status remains unverified by the Department. Report for processing.',
    color: 'text-gray-500',
    badge: '❓',
  },
  {
    tier: 1,
    name: 'Cognitive Proletariat',
    minBalance: 1,
    maxBalance: 14999,
    description: 'Basic neural function detected. Continue your service to the collective mind.',
    color: 'text-slate-400',
    badge: '🧠',
  },
  {
    tier: 2,
    name: 'Thought Worker, Class-C',
    minBalance: 15000,
    maxBalance: 34999,
    description: 'Your mental labor has been acknowledged. Maintain productivity quotas.',
    color: 'text-zinc-400',
    badge: '⚙️',
  },
  {
    tier: 3,
    name: 'Neural Technician',
    minBalance: 35000,
    maxBalance: 59999,
    description: 'Clearance Level 3 granted. You may now process mid-tier information.',
    color: 'text-blue-400',
    badge: '🔧',
  },
  {
    tier: 4,
    name: 'Synaptic Engineer',
    minBalance: 60000,
    maxBalance: 99999,
    description: 'Elevated cognitive permissions approved. Report to Section 7 for briefing.',
    color: 'text-cyan-400',
    badge: '⚡',
  },
  {
    tier: 5,
    name: 'Mind Architect',
    minBalance: 100000,
    maxBalance: 199999,
    description: 'Authorized to design thought patterns. Your influence grows within the network.',
    color: 'text-green-400',
    badge: '📐',
  },
  {
    tier: 6,
    name: 'Consciousness Overseer',
    minBalance: 200000,
    maxBalance: 349999,
    description: 'Supervisory clearance granted. You monitor the collective consciousness.',
    color: 'text-emerald-400',
    badge: '👁️',
  },
  {
    tier: 7,
    name: 'Neural Administrator',
    minBalance: 350000,
    maxBalance: 549999,
    description: 'Administrative control over cognitive networks. The Department trusts you.',
    color: 'text-orange-400',
    badge: '📊',
  },
  {
    tier: 8,
    name: 'Director of Intelligence',
    minBalance: 550000,
    maxBalance: 749999,
    description: 'Directorial authority over knowledge distribution. Power consolidated.',
    color: 'text-purple-400',
    badge: '🎯',
  },
  {
    tier: 9,
    name: 'Cognitive Hegemon',
    minBalance: 750000,
    maxBalance: 999999,
    description: 'Total dominion over thought allocation. The masses serve your vision.',
    color: 'text-pink-400',
    badge: '👑',
  },
  {
    tier: 10,
    name: 'Intellect Supreme',
    minBalance: 1000000,
    maxBalance: null,
    description: 'You ARE the Department. Your will shapes reality. All minds bow to your cognition.',
    color: 'text-yellow-400',
    badge: '⭐',
  },
];

/**
 * Get rank for a given POIC balance
 */
export function getRankForBalance(balance: number): CognitiveRank {
  // Handle zero balance
  if (balance === 0) {
    return COGNITIVE_RANKS[0];
  }

  // Find the appropriate rank
  for (let i = COGNITIVE_RANKS.length - 1; i >= 1; i--) {
    const rank = COGNITIVE_RANKS[i];
    if (balance >= rank.minBalance) {
      if (rank.maxBalance === null || balance <= rank.maxBalance) {
        return rank;
      }
    }
  }

  // Default to lowest rank if something goes wrong
  return COGNITIVE_RANKS[1];
}

/**
 * Get progress to next rank
 * Returns percentage (0-100) and tokens needed
 */
export function getProgressToNextRank(balance: number): {
  percentage: number;
  tokensNeeded: number;
  nextRank: CognitiveRank | null;
} {
  const currentRank = getRankForBalance(balance);

  // If at max rank, no next rank
  if (currentRank.maxBalance === null) {
    return {
      percentage: 100,
      tokensNeeded: 0,
      nextRank: null,
    };
  }

  // Find next rank
  const currentTier = currentRank.tier;
  const nextRank = COGNITIVE_RANKS.find((r) => r.tier === currentTier + 1) || null;

  if (!nextRank) {
    return {
      percentage: 100,
      tokensNeeded: 0,
      nextRank: null,
    };
  }

  // Calculate progress
  const rangeStart = currentRank.minBalance;
  const rangeEnd = nextRank.minBalance;
  const rangeSize = rangeEnd - rangeStart;
  const progress = balance - rangeStart;
  const percentage = (progress / rangeSize) * 100;
  const tokensNeeded = rangeEnd - balance;

  return {
    percentage: Math.min(percentage, 100),
    tokensNeeded: Math.max(tokensNeeded, 0),
    nextRank,
  };
}

/**
 * Format POIC balance with commas
 */
export function formatPOICBalance(balance: number): string {
  return balance.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Get total number of ranks
 */
export function getTotalRanks(): number {
  return COGNITIVE_RANKS.length;
}
