# AI Guardian: Real-Time Misinformation Monitor

A decentralized network of AI agents that continuously scan the web for misinformation, using advanced NLP and machine learning techniques to verify facts and flag false information, leveraging **OriginTrail** and **Polkadot** for cross-chain data sharing.

## Features

- **Real-Time News Monitoring**: Continuously fetches and analyzes news articles from RSS feeds
- **NLP-Powered Analysis**: Extracts claims and detects misinformation indicators using natural language processing
- **Automated Fact-Checking**: Verifies claims using external fact-checking APIs (Google Fact Check API) with intelligent fallback
- **Decentralized Storage**: Stores verified information on OriginTrail's Decentralized Knowledge Graph (DKG)
- **Cross-Chain Verification**: Uses Polkadot network for cross-chain data sharing and verification
- **Credibility Scoring**: Assigns credibility scores to articles based on multiple factors
- **Flagging System**: Automatically flags suspicious content for review

## Architecture

```
┌─────────────┐
│  RSS Feeds  │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    News     │─────▶│     NLP      │─────▶│    Fact     │
│   Fetcher   │      │   Analyzer   │      │   Checker   │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │  Guardian   │
                                            │   Service   │
                                            └──────┬──────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    ▼                             ▼
                            ┌──────────────┐            ┌──────────────┐
                            │ OriginTrail  │            │  Polkadot    │
                            │     DKG      │            │   Network    │
                            └──────────────┘            └──────────────┘
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- (Optional) OriginTrail node access
- (Optional) Polkadot network access
- (Optional) Google Fact Check API key

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd newswatch
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

## Configuration

Edit `.env` file with your settings:

```env
# News Sources (comma-separated RSS feed URLs)
NEWS_RSS_FEEDS=https://rss.nytimes.com/services/xml/rss/nyt/World.xml,https://feeds.bbci.co.uk/news/world/rss.xml

# Google Fact Check API (optional - system will use fallback if not provided)
GOOGLE_FACT_CHECK_API_KEY=your_api_key_here

# OriginTrail Configuration
ORIGINTRAIL_NODE_HOSTNAME=http://localhost:8900
ORIGINTRAIL_NODE_PORT=8900

# Polkadot Configuration
POLKADOT_RPC_ENDPOINT=wss://rpc.polkadot.io

# Application Settings
SCAN_INTERVAL_MINUTES=30
MIN_CONFIDENCE_THRESHOLD=0.6
LOG_LEVEL=info
```

## Usage

### Development Mode

Run a single check:
```bash
npm run dev check
```

Start continuous monitoring:
```bash
npm run dev monitor
```

Check service status:
```bash
npm run dev status
```

Show help:
```bash
npm run dev help
```

### Production Mode

Build and run:
```bash
npm run build
npm start
```

## How It Works

### 1. News Fetching
The system fetches articles from configured RSS feeds, supporting major news sources like NYT, BBC, Reuters, etc.

### 2. NLP Analysis
Each article is analyzed using NLP to:
- Extract factual claims
- Detect uncertainty language
- Identify sensational content
- Check for cited sources
- Extract entities (people, organizations, places)

### 3. Fact-Checking
Claims are verified through:
- **Primary**: Google Fact Check API (if configured)
- **Fallback**: Heuristic analysis checking for:
  - Conspiracy language
  - Verification indicators
  - Unsourced statistics
  - Credibility patterns

### 4. Credibility Scoring
Articles receive a credibility score (0-1) based on:
- NLP analysis results (40% weight)
- Fact-check results (60% weight)

Articles scoring below the threshold are flagged for review.

### 5. Decentralized Storage

**OriginTrail DKG**: Flagged articles and fact-check results are stored as Knowledge Assets on the Decentralized Knowledge Graph, creating an immutable record.

**Polkadot Network**: Report hashes are stored on-chain for cross-chain verification and data integrity.

## API Reference

### GuardianService

Main orchestrator service:

```typescript
const service = new GuardianService(config);

// Initialize connections
await service.initialize();

// Run single cycle
const reports = await service.runMonitoringCycle();

// Process single article
const report = await service.processArticle(article);

// Start continuous monitoring
await service.startContinuousMonitoring();

// Get status
const status = await service.getStatus();

// Shutdown
await service.shutdown();
```

### Types

Key TypeScript interfaces:

```typescript
interface NewsArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt: Date;
  author?: string;
}

interface MisinformationReport {
  id: string;
  article: NewsArticle;
  claims: Claim[];
  factCheckResults: FactCheckResult[];
  overallScore: number; // 0-1 credibility score
  flags: string[];
  createdAt: Date;
}
```

## Output Example

```
[1] Example News Article Title
    Source: BBC News
    URL: https://example.com/article
    Credibility Score: 45.3%
    Claims Extracted: 5
    Fact Checks: 3
    ⚠️  Flags:
       - High uncertainty language detected
       - Lack of cited sources
    Verdicts: {"FALSE": 2, "UNVERIFIED": 1}
```

## MVP Limitations

This is an MVP with the following limitations:

1. **OriginTrail Integration**: Uses mock implementation - requires actual DKG SDK integration
2. **Polkadot Integration**: Basic implementation - requires custom pallet for production
3. **Fact-Checking**: Limited to Google API + heuristics - needs more data sources
4. **NLP Analysis**: Basic claim extraction - can be enhanced with ML models
5. **Scalability**: Single-threaded processing - needs queue system for scale

## Future Enhancements

- [ ] Integrate actual OriginTrail DKG SDK
- [ ] Deploy custom Polkadot pallet for data storage
- [ ] Add more fact-checking data sources (Snopes, PolitiFact, etc.)
- [ ] Implement ML-based claim detection
- [ ] Add image/video misinformation detection
- [ ] Create web dashboard for visualization
- [ ] Add agent network for distributed processing
- [ ] Implement reputation system for sources
- [ ] Add real-time alerts and notifications
- [ ] Support for multiple languages

## Technology Stack

- **Node.js/TypeScript**: Core application
- **RSS Parser**: News feed parsing
- **Compromise**: Natural language processing
- **OriginTrail**: Decentralized knowledge graph
- **Polkadot**: Cross-chain data sharing
- **Axios**: HTTP client
- **Winston**: Logging

## Contributing

This is an MVP. Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Disclaimer

This system is designed to assist in identifying potential misinformation but should not be the sole source of truth. Always verify important information through multiple trusted sources. The AI analysis is probabilistic and may have false positives/negatives.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with OriginTrail and Polkadot for a more trustworthy information ecosystem.**
