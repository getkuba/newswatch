#!/usr/bin/env node

import { GuardianService } from './services/GuardianService';
import { config } from './utils/config';
import { logger } from './utils/logger';

/**
 * AI Guardian: Real-Time Misinformation Monitor
 * Main entry point
 */

const ASCII_LOGO = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      █████╗ ██╗     ██████╗ ██╗   ██╗ █████╗ ██████╗    ║
║     ██╔══██╗██║    ██╔════╝ ██║   ██║██╔══██╗██╔══██╗   ║
║     ███████║██║    ██║  ███╗██║   ██║███████║██████╔╝   ║
║     ██╔══██║██║    ██║   ██║██║   ██║██╔══██║██╔══██╗   ║
║     ██║  ██║██║    ╚██████╔╝╚██████╔╝██║  ██║██║  ██║   ║
║     ╚═╝  ╚═╝╚═╝     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ║
║                                                           ║
║         Real-Time Misinformation Monitor                  ║
║      Powered by OriginTrail & Polkadot                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

async function main() {
  console.log(ASCII_LOGO);

  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const service = new GuardianService(config);

  try {
    switch (command) {
      case 'monitor':
        await runMonitor(service);
        break;

      case 'check':
        await runSingleCheck(service);
        break;

      case 'status':
        await showStatus(service);
        break;

      case 'help':
        showHelp();
        break;

      default:
        console.log(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Run continuous monitoring
 */
async function runMonitor(service: GuardianService) {
  logger.info('Starting AI Guardian in monitoring mode...');

  await service.initialize();
  await service.startContinuousMonitoring();

  // Keep process running
  process.on('SIGINT', async () => {
    logger.info('\nReceived SIGINT, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
  });
}

/**
 * Run a single check cycle
 */
async function runSingleCheck(service: GuardianService) {
  logger.info('Running single monitoring cycle...');

  await service.initialize();
  const reports = await service.runMonitoringCycle();

  console.log('\n' + '='.repeat(80));
  console.log('MONITORING CYCLE RESULTS');
  console.log('='.repeat(80) + '\n');

  if (reports.length === 0) {
    console.log('No articles processed.');
  } else {
    reports.forEach((report, index) => {
      console.log(`\n[${index + 1}] ${report.article.title}`);
      console.log(`    Source: ${report.article.source}`);
      console.log(`    URL: ${report.article.url}`);
      console.log(`    Credibility Score: ${(report.overallScore * 100).toFixed(1)}%`);
      console.log(`    Claims Extracted: ${report.claims.length}`);
      console.log(`    Fact Checks: ${report.factCheckResults.length}`);

      if (report.flags.length > 0) {
        console.log(`    ⚠️  Flags:`);
        report.flags.forEach(flag => console.log(`       - ${flag}`));
      }

      // Show verdict summary
      const verdicts = report.factCheckResults.reduce((acc, result) => {
        acc[result.verdict] = (acc[result.verdict] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      if (Object.keys(verdicts).length > 0) {
        console.log(`    Verdicts: ${JSON.stringify(verdicts)}`);
      }
    });

    console.log('\n' + '='.repeat(80));

    // Summary
    const flaggedCount = reports.filter(r => r.overallScore < config.minConfidenceThreshold).length;
    console.log(`\nSummary:`);
    console.log(`  Total articles: ${reports.length}`);
    console.log(`  Flagged for review: ${flaggedCount}`);
    console.log(`  Average credibility: ${(reports.reduce((s, r) => s + r.overallScore, 0) / reports.length * 100).toFixed(1)}%`);
  }

  await service.shutdown();
}

/**
 * Show service status
 */
async function showStatus(service: GuardianService) {
  logger.info('Checking service status...');

  await service.initialize();
  const status = await service.getStatus();

  console.log('\n' + '='.repeat(80));
  console.log('SERVICE STATUS');
  console.log('='.repeat(80) + '\n');

  console.log('Configuration:');
  console.log(`  Scan Interval: ${status.config.scanInterval} minutes`);
  console.log(`  RSS Feeds: ${status.config.feedCount}`);
  console.log(`  Min Confidence Threshold: ${config.minConfidenceThreshold}`);

  console.log('\nOriginTrail DKG:');
  console.log(`  Status: ${status.originTrail.healthy ? '✓ Healthy' : '✗ Unhealthy'}`);
  console.log(`  Node: ${config.originTrail.hostname}:${config.originTrail.port}`);

  console.log('\nPolkadot Network:');
  if (status.polkadot.status === 'disconnected') {
    console.log('  Status: ✗ Disconnected (running in mock mode)');
  } else {
    console.log('  Status: ✓ Connected');
    console.log(`  Peers: ${status.polkadot.peers}`);
    console.log(`  Syncing: ${status.polkadot.isSyncing ? 'Yes' : 'No'}`);
  }

  console.log('\n' + '='.repeat(80));

  await service.shutdown();
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Usage: npm run dev [command]

Commands:
  monitor    Start continuous monitoring (runs every ${config.scanIntervalMinutes} minutes)
  check      Run a single monitoring cycle
  status     Show service status and configuration
  help       Show this help message

Examples:
  npm run dev monitor    # Start continuous monitoring
  npm run dev check      # Run once and exit
  npm run dev status     # Check service status

Configuration:
  Copy .env.example to .env and configure your settings.

For more information, visit: https://github.com/yourusername/ai-guardian
  `);
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { GuardianService };
