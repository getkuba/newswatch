import { NewsFetcher } from './NewsFetcher';
import { NLPAnalyzer } from './NLPAnalyzer';
import { FactChecker } from './FactChecker';
import { OriginTrailClient } from '../integrations/OriginTrailClient';
import { PolkadotClient } from '../integrations/PolkadotClient';
import { MisinformationReport, NewsArticle, Config } from '../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Main Guardian service that orchestrates misinformation monitoring
 */
export class GuardianService {
  private newsFetcher: NewsFetcher;
  private nlpAnalyzer: NLPAnalyzer;
  private factChecker: FactChecker;
  private originTrailClient: OriginTrailClient;
  private polkadotClient: PolkadotClient;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.newsFetcher = new NewsFetcher();
    this.nlpAnalyzer = new NLPAnalyzer();
    this.factChecker = new FactChecker(config.googleFactCheckApiKey);
    this.originTrailClient = new OriginTrailClient(
      config.originTrail.hostname,
      config.originTrail.port
    );
    this.polkadotClient = new PolkadotClient(
      config.polkadot.rpcEndpoint,
      config.polkadot.seedPhrase
    );

    logger.info('Guardian Service initialized');
  }

  /**
   * Initialize connections to blockchain networks
   */
  async initialize(): Promise<boolean> {
    try {
      logger.info('Initializing Guardian Service...');

      // Connect to Polkadot (optional - will work in mock mode if connection fails)
      const polkadotConnected = await this.polkadotClient.connect();
      if (!polkadotConnected) {
        logger.warn('Polkadot connection failed - continuing in mock mode');
      }

      logger.info('Guardian Service ready');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Guardian Service:', error);
      return false;
    }
  }

  /**
   * Run a single monitoring cycle
   */
  async runMonitoringCycle(): Promise<MisinformationReport[]> {
    logger.info('Starting monitoring cycle...');

    try {
      // 1. Fetch news articles
      const articles = await this.newsFetcher.fetchFromRSS(this.config.newsRssFeeds);
      logger.info(`Fetched ${articles.length} articles`);

      if (articles.length === 0) {
        logger.warn('No articles fetched');
        return [];
      }

      // 2. Process each article
      const reports: MisinformationReport[] = [];

      for (const article of articles) {
        try {
          const report = await this.processArticle(article);
          if (report) {
            reports.push(report);

            // Store on DKG and Polkadot if confidence is high enough
            if (report.overallScore < this.config.minConfidenceThreshold) {
              await this.storeReport(report);
            }
          }
        } catch (error) {
          logger.error(`Error processing article ${article.title}:`, error);
        }
      }

      logger.info(`Monitoring cycle complete. Processed ${reports.length} articles`);
      return reports;
    } catch (error) {
      logger.error('Error in monitoring cycle:', error);
      return [];
    }
  }

  /**
   * Process a single article
   */
  async processArticle(article: NewsArticle): Promise<MisinformationReport | null> {
    try {
      logger.info(`Processing article: ${article.title}`);

      // 1. Extract claims
      const claims = this.nlpAnalyzer.extractClaims(article);

      if (claims.length === 0) {
        logger.info('No claims extracted from article');
        return null;
      }

      // 2. Analyze for misinformation indicators
      const analysis = this.nlpAnalyzer.analyzeMisinformationIndicators(article);

      // 3. Fact-check claims
      const factCheckResults = await this.factChecker.checkClaims(claims);

      // 4. Calculate overall credibility score
      const overallScore = this.calculateOverallScore(analysis.score, factCheckResults);

      // 5. Create report
      const report: MisinformationReport = {
        id: this.generateReportId(),
        article,
        claims,
        factCheckResults,
        overallScore,
        flags: analysis.flags,
        createdAt: new Date(),
      };

      logger.info(
        `Article processed. Score: ${overallScore.toFixed(2)}, Flags: ${analysis.flags.length}`
      );

      return report;
    } catch (error) {
      logger.error('Error processing article:', error);
      return null;
    }
  }

  /**
   * Store report on DKG and Polkadot
   */
  private async storeReport(report: MisinformationReport): Promise<void> {
    try {
      logger.info(`Storing report for flagged article: ${report.article.title}`);

      // Store on OriginTrail DKG
      const dkgAsset = await this.originTrailClient.publishReport(report);

      if (dkgAsset) {
        // Store hash on Polkadot for cross-chain verification
        await this.polkadotClient.storeReportHash(report, dkgAsset.UAL);
      }
    } catch (error) {
      logger.error('Error storing report:', error);
    }
  }

  /**
   * Calculate overall credibility score
   */
  private calculateOverallScore(
    nlpScore: number,
    factCheckResults: any[]
  ): number {
    if (factCheckResults.length === 0) {
      return nlpScore;
    }

    // Calculate average fact-check confidence
    const avgFactCheckScore =
      factCheckResults.reduce((sum, result) => {
        let score = result.confidence;
        if (result.verdict === 'FALSE') score = 1 - score;
        else if (result.verdict === 'MIXED') score = 0.5;
        return sum + score;
      }, 0) / factCheckResults.length;

    // Combine NLP and fact-check scores (weighted average)
    return nlpScore * 0.4 + avgFactCheckScore * 0.6;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Start continuous monitoring
   */
  async startContinuousMonitoring(): Promise<void> {
    logger.info(
      `Starting continuous monitoring (interval: ${this.config.scanIntervalMinutes} minutes)`
    );

    const intervalMs = this.config.scanIntervalMinutes * 60 * 1000;

    // Run immediately
    await this.runMonitoringCycle();

    // Then run at intervals
    setInterval(async () => {
      await this.runMonitoringCycle();
    }, intervalMs);
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Guardian Service...');
    await this.polkadotClient.disconnect();
    logger.info('Guardian Service shut down');
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<any> {
    const polkadotStatus = await this.polkadotClient.getNetworkStatus();
    const originTrailHealth = await this.originTrailClient.getNodeHealth();

    return {
      polkadot: polkadotStatus || { status: 'disconnected' },
      originTrail: { healthy: originTrailHealth },
      config: {
        scanInterval: this.config.scanIntervalMinutes,
        feedCount: this.config.newsRssFeeds.length,
      },
    };
  }
}
