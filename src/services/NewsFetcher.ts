import Parser from 'rss-parser';
import { NewsArticle } from '../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class NewsFetcher {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['description', 'content:encoded', 'content'],
      },
    });
  }

  /**
   * Fetch articles from RSS feeds
   */
  async fetchFromRSS(feedUrls: string[]): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    for (const feedUrl of feedUrls) {
      try {
        logger.info(`Fetching RSS feed: ${feedUrl}`);
        const feed = await this.parser.parseURL(feedUrl);

        for (const item of feed.items) {
          if (!item.title || !item.link) continue;

          const content =
            (item as any)['content:encoded'] ||
            item.content ||
            item.contentSnippet ||
            item.description ||
            '';

          const article: NewsArticle = {
            id: this.generateId(item.link),
            title: item.title,
            content: this.stripHtml(content),
            url: item.link,
            source: feed.title || feedUrl,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            author: item.creator || item.author,
          };

          articles.push(article);
        }

        logger.info(`Fetched ${feed.items.length} articles from ${feed.title || feedUrl}`);
      } catch (error) {
        logger.error(`Error fetching RSS feed ${feedUrl}:`, error);
      }
    }

    return articles;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Generate a unique ID for an article
   */
  private generateId(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }
}
