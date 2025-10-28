import type { EchoQuestion } from '@poim/shared';

/**
 * Simple in-memory cache for storing question metadata
 * In production, this should be replaced with Redis, database, or similar
 */
class QuestionCache {
  private cache = new Map<string, { question: EchoQuestion; correctAnswer: string; createdAt: number }>();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Store a question with its correct answer
   */
  store(question: EchoQuestion, correctAnswer: string): void {
    this.cache.set(question.id, {
      question,
      correctAnswer,
      createdAt: Date.now(),
    });

    // Clean up old entries periodically
    this.cleanup();
  }

  /**
   * Get a question from cache
   */
  get(questionId: string): { question: EchoQuestion; correctAnswer: string } | null {
    const entry = this.cache.get(questionId);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.createdAt > this.TTL) {
      this.cache.delete(questionId);
      return null;
    }

    return {
      question: entry.question,
      correctAnswer: entry.correctAnswer,
    };
  }

  /**
   * Delete a question from cache (after verification)
   */
  delete(questionId: string): void {
    this.cache.delete(questionId);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.TTL) {
        this.cache.delete(id);
      }
    }
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let questionCache: QuestionCache | null = null;

/**
 * Get the singleton question cache instance
 */
export function getQuestionCache(): QuestionCache {
  if (!questionCache) {
    questionCache = new QuestionCache();
  }
  return questionCache;
}
