import { JobGoCrawler, VietnamWorksCrawler, TopCVCrawler } from "../crawlers";
import { CompanyInput } from "../interfaces";
import { JobsMongoService } from "./jobs-mongo.service"; // MongoDB Service
import { JobsPgService } from "./jobs-pg.service";

// Định nghĩa các nguồn crawl có sẵn
export type CrawlSource = "jobgo" | "vietnamworks" | "topcv";

// Interface cho options của từng nguồn
interface JobGoOptions {
  baseUrl?: string;
  industries?: string[];
  maxPages?: number;
}

interface VietnamWorksOptions {
  url?: string;
  userId?: string;
}

interface TopCVOptions {
  url?: string;
  maxPages?: number;
  fetchDetail?: boolean;
}

export interface CrawlOptions {
  jobgo?: JobGoOptions;
  vietnamworks?: VietnamWorksOptions;
  topcv?: TopCVOptions;
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
  private static readonly logger = console;

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
          description: "Crawl từ vietnamworks.com - sử dụng API trực tiếp",
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
    options?: JobGoOptions & { saveToDb?: boolean },
  ): Promise<CrawlResult> {
    this.logger.log("🚀 Starting JobGo crawl...");
    try {
      const companies = await JobGoCrawler.crawl({
        baseUrl: options?.baseUrl,
        industries: options?.industries,
        maxPages: options?.maxPages,
      });

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
    options?: VietnamWorksOptions & { saveToDb?: boolean },
  ): Promise<CrawlResult> {
    this.logger.log("🚀 Starting VietnamWorks crawl...");
    try {
      const companies = await VietnamWorksCrawler.crawl({
        url: options?.url,
        userId: options?.userId,
      });

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
