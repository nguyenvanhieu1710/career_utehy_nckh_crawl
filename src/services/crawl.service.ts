import { JobGoCrawler, VietnamWorksCrawler, TopCVCrawler } from "../crawlers";
import { CompanyInput, CrawlerOptions } from "../interfaces";
// import { JobsMongoService } from "./jobs-mongo.service"; // MongoDB Service
import { JobsPgService } from "./jobs-pg.service";
import { Logger } from "../utils/logger";

// Định nghĩa các nguồn crawl có sẵn
export type CrawlSource = "jobgo" | "vietnamworks" | "topcv";

// Interface cho options của từng nguồn
interface TopCVOptions {
  url?: string;
  maxPages?: number;
  fetchDetail?: boolean;
  saveToDb?: boolean;
}

export interface CrawlOptions {
  jobgo?: CrawlerOptions;
  vietnamworks?: CrawlerOptions;
  topcv?: CrawlerOptions;
  saveToDb?: boolean;
}

export interface CrawlResult {
  source: string;
  companies: CompanyInput[];
  companyCount: number;
  jobCount: number;
  success: boolean;
  error?: string;
  savedToDb?: {
    inserted: number;
    updated: number;
  };
}

export class CrawlService {
  private static readonly logger = Logger;

  // Lấy danh sách các nguồn crawl có sẵn
  static getAvailableSources(): {
    sources: CrawlSource[];
    details: Record<string, { name: string; description: string }>;
  } {
    return {
      sources: ["jobgo", "vietnamworks", "topcv"],
      details: {
        jobgo: {
          name: "JobGo",
          description: "Crawl từ jobsgo.vn - sử dụng Puppeteer để scrape HTML",
        },
        vietnamworks: {
          name: "VietnamWorks",
          description:
            "Crawl từ vietnamworks.com - sử dụng Puppeteer để scrape HTML",
        },
        topcv: {
          name: "TopCV",
          description: "Crawl từ topcv.vn - sử dụng Puppeteer để scrape HTML",
        },
      },
    };
  }

  // Crawl từ JobGo
  static async crawlJobGo(
    options?: CrawlerOptions & { saveToDb?: boolean },
  ): Promise<CrawlResult> {
    this.logger.log("🚀 Starting JobGo crawl...");
    try {
      const crawler = new JobGoCrawler();
      const companies = await crawler.crawl(options);

      const jobCount = companies.reduce((sum, c) => sum + c.jobs.length, 0);

      const result: CrawlResult = {
        source: "jobgo",
        companies,
        companyCount: companies.length,
        jobCount,
        success: true,
      };

      // Lưu vào database nếu được yêu cầu
      if (options?.saveToDb) {
        // Toggle MongoDB save here
        // const mongoResult = await JobsMongoService.saveCompanies(companies);

        const pgResult = await JobsPgService.saveCompanies(companies);

        result.savedToDb = {
          inserted: pgResult.inserted, // Switch to mongoResult.inserted if using Mongo
          updated: pgResult.updated, // Switch to mongoResult.updated if using Mongo
        };
      }

      this.logger.log(
        `✅ JobGo crawl completed: ${companies.length} companies, ${jobCount} jobs`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ JobGo crawl failed: ${error}`);
      return {
        source: "jobgo",
        companies: [],
        companyCount: 0,
        jobCount: 0,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Crawl từ TopCV
  static async crawlTopCV(
    options?: TopCVOptions & { saveToDb?: boolean },
  ): Promise<CrawlResult> {
    this.logger.log("Starting TopCV crawl...");
    try {
      const companies = await TopCVCrawler.crawl({
        url: options?.url,
        maxPages: options?.maxPages,
        fetchDetail: options?.fetchDetail,
      });

      const jobCount = companies.reduce((sum, c) => sum + c.jobs.length, 0);

      const result: CrawlResult = {
        source: "topcv",
        companies,
        companyCount: companies.length,
        jobCount,
        success: true,
      };

      if (options?.saveToDb) {
        // Toggle MongoDB save here
        // await JobsService.saveCompanies(companies);

        const pgResult = await JobsPgService.saveCompanies(companies);
        result.savedToDb = {
          inserted: pgResult.inserted,
          updated: pgResult.updated,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`TopCV crawl failed: ${error}`);
      return {
        source: "topcv",
        companies: [],
        companyCount: 0,
        jobCount: 0,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Crawl từ VietnamWorks
  static async crawlVietnamWorks(
    options?: CrawlerOptions & { saveToDb?: boolean },
  ): Promise<CrawlResult> {
    this.logger.log("🚀 Starting VietnamWorks crawl...");
    try {
      const crawler = new VietnamWorksCrawler();
      const companies = await crawler.crawl(options);

      const jobCount = companies.reduce((sum, c) => sum + c.jobs.length, 0);

      const result: CrawlResult = {
        source: "vietnamworks",
        companies,
        companyCount: companies.length,
        jobCount,
        success: true,
      };

      // Lưu vào database nếu được yêu cầu
      if (options?.saveToDb) {
        // Toggle MongoDB save here
        // await JobsMongoService.saveCompanies(companies);

        const pgResult = await JobsPgService.saveCompanies(companies);

        result.savedToDb = {
          inserted: pgResult.inserted,
          updated: pgResult.updated,
        };
      }

      this.logger.log(
        `✅ VietnamWorks crawl completed: ${companies.length} companies, ${jobCount} jobs`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ VietnamWorks crawl failed: ${error}`);
      return {
        source: "vietnamworks",
        companies: [],
        companyCount: 0,
        jobCount: 0,
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
