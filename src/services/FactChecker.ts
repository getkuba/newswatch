import axios from 'axios';
import { Claim, FactCheckResult } from '../types';
import { logger } from '../utils/logger';

export class FactChecker {
  private googleApiKey?: string;

  constructor(googleApiKey?: string) {
    this.googleApiKey = googleApiKey;
  }

  /**
   * Check a claim using available fact-checking services
   */
  async checkClaim(claim: Claim): Promise<FactCheckResult> {
    logger.info(`Checking claim: ${claim.text.substring(0, 100)}...`);

    // Try Google Fact Check API if available
    if (this.googleApiKey) {
      try {
        const result = await this.checkWithGoogleFactCheck(claim);
        if (result) return result;
      } catch (error) {
        logger.warn('Google Fact Check API failed, using fallback', error);
      }
    }

    // Fallback to heuristic analysis
    return this.heuristicFactCheck(claim);
  }

  /**
   * Check claim using Google Fact Check API
   */
  private async checkWithGoogleFactCheck(claim: Claim): Promise<FactCheckResult | null> {
    try {
      const query = encodeURIComponent(claim.text);
      const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${query}&key=${this.googleApiKey}`;

      const response = await axios.get(url);

      if (response.data.claims && response.data.claims.length > 0) {
        const firstClaim = response.data.claims[0];
        const review = firstClaim.claimReview?.[0];

        if (review) {
          return {
            claim,
            verdict: this.normalizeVerdict(review.textualRating),
            confidence: 0.8,
            sources: [review.url],
            explanation: review.textualRating,
            checkedAt: new Date(),
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error calling Google Fact Check API:', error);
      return null;
    }
  }

  /**
   * Heuristic-based fact checking (fallback method)
   */
  private heuristicFactCheck(claim: Claim): FactCheckResult {
    const text = claim.text.toLowerCase();
    let confidence = 0.5;
    let verdict: FactCheckResult['verdict'] = 'UNVERIFIED';
    const flags: string[] = [];

    // Check for red flags
    const redFlags = ['conspiracy', 'cover-up', 'they don\'t want you to know'];
    const hasRedFlags = redFlags.some(flag => text.includes(flag));

    if (hasRedFlags) {
      confidence = 0.3;
      verdict = 'FALSE';
      flags.push('Contains conspiracy language');
    }

    // Check for verification indicators
    const verificationIndicators = ['study published', 'peer-reviewed', 'official statement'];
    const hasVerification = verificationIndicators.some(indicator => text.includes(indicator));

    if (hasVerification) {
      confidence = 0.7;
      verdict = 'TRUE';
      flags.push('Contains verification indicators');
    }

    // Check for numbers without sources
    const hasNumbers = /\d+%|\d+\s*(million|billion|thousand)/.test(text);
    const hasSources = /according to|source|research|study/.test(text);

    if (hasNumbers && !hasSources) {
      confidence = Math.max(0.3, confidence - 0.2);
      flags.push('Contains statistics without clear sources');
    }

    return {
      claim,
      verdict,
      confidence,
      sources: [],
      explanation: flags.join('; ') || 'Heuristic analysis - manual verification recommended',
      checkedAt: new Date(),
    };
  }

  /**
   * Normalize verdict from various fact-checking services
   */
  private normalizeVerdict(textualRating: string): FactCheckResult['verdict'] {
    const rating = textualRating.toLowerCase();

    if (rating.includes('true') || rating.includes('correct') || rating.includes('accurate')) {
      return 'TRUE';
    }
    if (rating.includes('false') || rating.includes('incorrect') || rating.includes('wrong')) {
      return 'FALSE';
    }
    if (rating.includes('mixed') || rating.includes('partly') || rating.includes('mostly')) {
      return 'MIXED';
    }
    if (rating.includes('unverified') || rating.includes('unproven')) {
      return 'UNVERIFIED';
    }

    return 'UNKNOWN';
  }

  /**
   * Batch check multiple claims
   */
  async checkClaims(claims: Claim[]): Promise<FactCheckResult[]> {
    const results: FactCheckResult[] = [];

    for (const claim of claims) {
      try {
        const result = await this.checkClaim(claim);
        results.push(result);

        // Rate limiting - wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Error checking claim:', error);
      }
    }

    return results;
  }
}
