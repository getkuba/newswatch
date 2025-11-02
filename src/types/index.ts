/**
 * Core types for AI Guardian system
 */

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt: Date;
  author?: string;
}

export interface Claim {
  text: string;
  context: string;
  article: NewsArticle;
  extractedAt: Date;
}

export interface FactCheckResult {
  claim: Claim;
  verdict: 'TRUE' | 'FALSE' | 'MIXED' | 'UNVERIFIED' | 'UNKNOWN';
  confidence: number;
  sources: string[];
  explanation: string;
  checkedAt: Date;
}

export interface MisinformationReport {
  id: string;
  article: NewsArticle;
  claims: Claim[];
  factCheckResults: FactCheckResult[];
  overallScore: number; // 0-1, where 0 is completely false, 1 is completely true
  flags: string[];
  createdAt: Date;
}

export interface DKGAsset {
  UAL: string;
  publicAssertionId?: string;
  assertionId?: string;
  data: any;
}

export interface Config {
  newsRssFeeds: string[];
  googleFactCheckApiKey?: string;
  originTrail: {
    hostname: string;
    port: number;
    walletPublicKey?: string;
    walletPrivateKey?: string;
  };
  polkadot: {
    rpcEndpoint: string;
    seedPhrase?: string;
  };
  scanIntervalMinutes: number;
  minConfidenceThreshold: number;
  logLevel: string;
}
