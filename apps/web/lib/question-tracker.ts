import { createHash } from 'crypto';

/**
 * Question Tracking System
 *
 * Prevents users from seeing the same question twice by tracking:
 * - User ID + Question text hash
 *
 * This prevents exploits where users could mint multiple times off the same question
 */

// In-memory store of asked questions per user
// Key: userId, Value: Set of question hashes
const userQuestionHistory = new Map<string, Set<string>>();

/**
 * Create a hash of question text for tracking
 */
export function hashQuestion(questionText: string): string {
  return createHash('sha256').update(questionText.toLowerCase().trim()).digest('hex');
}

/**
 * Check if a user has already seen this question
 */
export function hasUserSeenQuestion(userId: string, questionText: string): boolean {
  const questionHash = hashQuestion(questionText);
  const userHistory = userQuestionHistory.get(userId);

  if (!userHistory) {
    return false;
  }

  return userHistory.has(questionHash);
}

/**
 * Mark a question as asked to a user
 */
export function markQuestionAsAsked(userId: string, questionText: string): void {
  const questionHash = hashQuestion(questionText);

  let userHistory = userQuestionHistory.get(userId);
  if (!userHistory) {
    userHistory = new Set<string>();
    userQuestionHistory.set(userId, userHistory);
  }

  userHistory.add(questionHash);
  console.log(`[QuestionTracker] User ${userId.slice(0, 8)}... has seen ${userHistory.size} unique questions`);
}

/**
 * Get count of unique questions seen by a user
 */
export function getUserQuestionCount(userId: string): number {
  const userHistory = userQuestionHistory.get(userId);
  return userHistory ? userHistory.size : 0;
}

/**
 * Clear a user's question history (admin function)
 */
export function clearUserHistory(userId: string): void {
  userQuestionHistory.delete(userId);
  console.log(`[QuestionTracker] Cleared history for user ${userId.slice(0, 8)}...`);
}

/**
 * Get total stats
 */
export function getTrackerStats(): { totalUsers: number; totalQuestions: number } {
  let totalQuestions = 0;
  userQuestionHistory.forEach((questions) => {
    totalQuestions += questions.size;
  });

  return {
    totalUsers: userQuestionHistory.size,
    totalQuestions,
  };
}
