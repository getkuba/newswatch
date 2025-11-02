import nlp from 'compromise';
import { NewsArticle, Claim } from '../types';
import { logger } from '../utils/logger';

export class NLPAnalyzer {
  // Keywords that often indicate factual claims
  private claimIndicators = [
    'said', 'says', 'reported', 'announced', 'confirmed', 'revealed',
    'claimed', 'stated', 'according to', 'research shows', 'studies show',
    'data shows', 'statistics show', 'experts say', 'scientists found'
  ];

  // Words that often indicate uncertainty or potential misinformation
  private uncertaintyIndicators = [
    'allegedly', 'supposedly', 'reportedly', 'rumored', 'unconfirmed',
    'believed', 'might', 'may', 'could', 'possibly', 'perhaps'
  ];

  /**
   * Extract claims from an article
   */
  extractClaims(article: NewsArticle): Claim[] {
    const claims: Claim[] = [];
    const doc = nlp(article.content);

    // Split into sentences
    const sentences = doc.sentences().out('array');

    for (const sentence of sentences) {
      // Check if sentence contains claim indicators
      const hasClaimIndicator = this.claimIndicators.some(indicator =>
        sentence.toLowerCase().includes(indicator)
      );

      // Check for numbers or statistics (often used in factual claims)
      const hasNumbers = /\d+/.test(sentence);

      // Extract if it looks like a claim
      if (hasClaimIndicator || hasNumbers) {
        claims.push({
          text: sentence,
          context: this.getContext(sentence, article.content),
          article: article,
          extractedAt: new Date(),
        });
      }
    }

    logger.info(`Extracted ${claims.length} claims from article: ${article.title}`);
    return claims;
  }

  /**
   * Analyze article for misinformation indicators
   */
  analyzeMisinformationIndicators(article: NewsArticle): {
    score: number;
    flags: string[];
  } {
    const flags: string[] = [];
    let score = 1.0; // Start with full credibility

    const content = article.content.toLowerCase();
    const title = article.title.toLowerCase();

    // Check for excessive uncertainty language
    const uncertaintyCount = this.uncertaintyIndicators.filter(word =>
      content.includes(word)
    ).length;

    if (uncertaintyCount > 5) {
      flags.push('High uncertainty language detected');
      score -= 0.2;
    }

    // Check for sensational language in title
    if (/!{2,}/.test(article.title) || /BREAKING|SHOCKING|UNBELIEVABLE/i.test(title)) {
      flags.push('Sensational title detected');
      score -= 0.15;
    }

    // Check for ALL CAPS usage (often indicates sensationalism)
    const capsWords = article.title.match(/\b[A-Z]{3,}\b/g);
    if (capsWords && capsWords.length > 2) {
      flags.push('Excessive capitalization detected');
      score -= 0.1;
    }

    // Check for emotional language
    const emotionalWords = ['outrage', 'scandal', 'crisis', 'disaster', 'devastating'];
    const emotionalCount = emotionalWords.filter(word => content.includes(word)).length;

    if (emotionalCount > 3) {
      flags.push('High emotional language detected');
      score -= 0.1;
    }

    // Check for lack of sources
    const hasSources = /according to|source|research|study|data/i.test(content);
    if (!hasSources) {
      flags.push('Lack of cited sources');
      score -= 0.2;
    }

    // Ensure score stays between 0 and 1
    score = Math.max(0, Math.min(1, score));

    return { score, flags };
  }

  /**
   * Get surrounding context for a claim
   */
  private getContext(sentence: string, fullText: string, contextSize: number = 100): string {
    const index = fullText.indexOf(sentence);
    if (index === -1) return sentence;

    const start = Math.max(0, index - contextSize);
    const end = Math.min(fullText.length, index + sentence.length + contextSize);

    return fullText.substring(start, end);
  }

  /**
   * Extract entities (people, organizations, places) from text
   */
  extractEntities(text: string): {
    people: string[];
    organizations: string[];
    places: string[];
  } {
    const doc = nlp(text);

    return {
      people: doc.people().out('array'),
      organizations: doc.organizations().out('array'),
      places: doc.places().out('array'),
    };
  }
}
