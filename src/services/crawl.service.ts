import { JobGoCrawler, VietnamWorksCrawler } from "../crawlers";
import { CompanyInput } from "../interfaces";
import { JobsService } from "./jobs.service";

// Định nghĩa các nguồn crawl có sẵn
export type CrawlSource = "jobgo" | "vietnamworks" | "all";

// Interface cho options của từng nguồn
interface JobGoOptions {
    industries?: string[];
    maxPages?: number;
}

interface VietnamWorksOptions {
    userId?: string;
}

export interface CrawlOptions {
    jobgo?: JobGoOptions;
    vietnamworks?: VietnamWorksOptions;
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
            sources: ["jobgo", "vietnamworks", "all"],
            details: {
                jobgo: {
                    name: "JobGo",
                    description: "Crawl từ jobsgo.vn - sử dụng Puppeteer để scrape HTML",
                },
                vietnamworks: {
                    name: "VietnamWorks",
                    description: "Crawl từ vietnamworks.com - sử dụng API trực tiếp",
                },
                all: {
                    name: "All Sources",
                    description: "Crawl từ tất cả các nguồn",
                },
            },
        };
    }

    // Crawl từ JobGo
    static async crawlJobGo(
        options?: JobGoOptions & { saveToDb?: boolean }
    ): Promise<CrawlResult> {
        this.logger.log("🚀 Starting JobGo crawl...");
        try {
            const companies = await JobGoCrawler.crawl({
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
                const saveResult = await JobsService.saveCompanies(companies);
                result.savedToDb = {
                    inserted: saveResult.inserted,
                    updated: saveResult.updated,
                };
            }

            this.logger.log(
                `✅ JobGo crawl completed: ${companies.length} companies, ${jobCount} jobs`
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

    // Crawl từ VietnamWorks
    static async crawlVietnamWorks(
        options?: VietnamWorksOptions & { saveToDb?: boolean }
    ): Promise<CrawlResult> {
        this.logger.log("🚀 Starting VietnamWorks crawl...");
        try {
            const companies = await VietnamWorksCrawler.crawl({
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
                const saveResult = await JobsService.saveCompanies(companies);
                result.savedToDb = {
                    inserted: saveResult.inserted,
                    updated: saveResult.updated,
                };
            }

            this.logger.log(
                `✅ VietnamWorks crawl completed: ${companies.length} companies, ${jobCount} jobs`
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

    // Crawl từ tất cả các nguồn
    static async crawlAll(options?: CrawlOptions): Promise<CrawlResult[]> {
        this.logger.log("🚀 Starting crawl from all sources...");

        const results: CrawlResult[] = [];

        // Crawl song song từ tất cả các nguồn
        const [jobgoResult, vietnamworksResult] = await Promise.allSettled([
            this.crawlJobGo({ ...options?.jobgo, saveToDb: options?.saveToDb }),
            this.crawlVietnamWorks({
                ...options?.vietnamworks,
                saveToDb: options?.saveToDb,
            }),
        ]);

        if (jobgoResult.status === "fulfilled") {
            results.push(jobgoResult.value);
        } else {
            results.push({
                source: "jobgo",
                companies: [],
                companyCount: 0,
                jobCount: 0,
                success: false,
                error: jobgoResult.reason?.message || "Unknown error",
            });
        }

        if (vietnamworksResult.status === "fulfilled") {
            results.push(vietnamworksResult.value);
        } else {
            results.push({
                source: "vietnamworks",
                companies: [],
                companyCount: 0,
                jobCount: 0,
                success: false,
                error: vietnamworksResult.reason?.message || "Unknown error",
            });
        }

        const totalCompanies = results.reduce((sum, r) => sum + r.companyCount, 0);
        const totalJobs = results.reduce((sum, r) => sum + r.jobCount, 0);
        this.logger.log(
            `✅ All crawls completed: ${totalCompanies} total companies, ${totalJobs} total jobs`
        );

        return results;
    }
}
