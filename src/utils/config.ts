import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

export const config: Config = {
  newsRssFeeds: process.env.NEWS_RSS_FEEDS?.split(',') || [
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
  ],
  googleFactCheckApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY,
  originTrail: {
    hostname: process.env.ORIGINTRAIL_NODE_HOSTNAME || 'http://localhost:8900',
    port: parseInt(process.env.ORIGINTRAIL_NODE_PORT || '8900'),
    walletPublicKey: process.env.ORIGINTRAIL_WALLET_PUBLIC_KEY,
    walletPrivateKey: process.env.ORIGINTRAIL_WALLET_PRIVATE_KEY,
  },
  polkadot: {
    rpcEndpoint: process.env.POLKADOT_RPC_ENDPOINT || 'wss://rpc.polkadot.io',
    seedPhrase: process.env.POLKADOT_SEED_PHRASE,
  },
  scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || '30'),
  minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.6'),
  logLevel: process.env.LOG_LEVEL || 'info',
};
