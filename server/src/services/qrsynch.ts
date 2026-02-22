import axios, { AxiosInstance } from 'axios';

interface QRsynchLink {
  id: string;
  shortUrl: string;
  originalUrl: string;
}

interface QRsynchAnalytics {
  clicks: number;
  uniqueClicks: number;
  topReferrers: Array<{ referrer: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
}

interface CreateLinkOptions {
  url: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

class QRsynchService {
  private client: AxiosInstance | null = null;
  private initialized = false;

  initialize(): void {
    const apiKey = process.env.QRSYNCH_API_KEY;
    const apiUrl = process.env.QRSYNCH_API_URL || 'https://api.qrsynch.com/v1';

    if (!apiKey) {
      console.warn('QRSYNCH_API_KEY not set - QRsynch integration disabled');
      return;
    }

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    this.initialized = true;
    console.log('QRsynch service initialized');
  }

  isAvailable(): boolean {
    return this.initialized && this.client !== null;
  }

  /**
   * Create a short link with optional UTM parameters
   * Returns null if QRsynch is unavailable or the request fails
   */
  async createShortLink(options: CreateLinkOptions): Promise<QRsynchLink | null> {
    if (!this.isAvailable() || !this.client) {
      return null;
    }

    try {
      const response = await this.client.post<QRsynchLink>('/links', {
        url: options.url,
        utmSource: options.utmSource,
        utmMedium: options.utmMedium,
        utmCampaign: options.utmCampaign,
      });

      return response.data;
    } catch (error) {
      console.error('QRsynch createShortLink failed:', error);
      return null;
    }
  }

  /**
   * Get analytics for a specific link
   */
  async getLinkAnalytics(linkId: string): Promise<QRsynchAnalytics | null> {
    if (!this.isAvailable() || !this.client) {
      return null;
    }

    try {
      const response = await this.client.get<QRsynchAnalytics>(`/links/${linkId}/analytics`);
      return response.data;
    } catch (error) {
      console.error('QRsynch getLinkAnalytics failed:', error);
      return null;
    }
  }

  /**
   * Generate short URLs for all links in a card
   * Returns the links array with qrsynchShortUrl and qrsynchLinkId populated
   */
  async generateLinksForCard(
    cardSlug: string,
    links: Array<{ type: string; value: string; label: string }>
  ): Promise<Array<{ qrsynchShortUrl?: string; qrsynchLinkId?: string }>> {
    const results: Array<{ qrsynchShortUrl?: string; qrsynchLinkId?: string }> = [];

    for (const link of links) {
      // Only generate short links for URL-type links
      const isUrl = link.value.startsWith('http://') || link.value.startsWith('https://');

      if (!isUrl || link.type === 'email' || link.type === 'phone') {
        results.push({});
        continue;
      }

      const shortLink = await this.createShortLink({
        url: link.value,
        utmSource: 'flashsynch',
        utmMedium: 'card',
        utmCampaign: cardSlug,
      });

      if (shortLink) {
        results.push({
          qrsynchShortUrl: shortLink.shortUrl,
          qrsynchLinkId: shortLink.id,
        });
      } else {
        results.push({});
      }
    }

    return results;
  }

  /**
   * Generate a short URL for the card page itself
   */
  async generateCardPageLink(cardSlug: string): Promise<{ shortUrl?: string; linkId?: string }> {
    const cardUrl = `https://flashsynch.com/c/${cardSlug}`;

    const shortLink = await this.createShortLink({
      url: cardUrl,
      utmSource: 'flashsynch',
      utmMedium: 'card_share',
      utmCampaign: cardSlug,
    });

    if (shortLink) {
      return {
        shortUrl: shortLink.shortUrl,
        linkId: shortLink.id,
      };
    }

    return {};
  }
}

export const qrsynchService = new QRsynchService();
