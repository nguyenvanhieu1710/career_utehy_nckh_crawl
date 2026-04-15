import { JobGoCrawler, VietnamWorksCrawler, TopCVCrawler } from "../crawlers";
import { CompanyInput } from "../interfaces";
import { JobsService } from "./jobs.service";
import { PostgresService } from "./postgres.service";

// Định nghĩa các nguồn crawl có sẵn
export type CrawlSource = "jobgo" | "vietnamworks" | "all";

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
                const [mongoResult, pgResult] = await Promise.allSettled([
                    JobsService.saveCompanies(companies),
                    PostgresService.saveCompanies(companies)
                ]);
                
                const saveResult = mongoResult.status === "fulfilled" ? mongoResult.value : { inserted: 0, updated: 0 };
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

    // Crawl từ TopCV
    static async crawlTopCV(
        options?: TopCVOptions & { saveToDb?: boolean }
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
                const [mongoResult] = await Promise.allSettled([
                    JobsService.saveCompanies(companies),
                    PostgresService.saveCompanies(companies),
                ]);
                const saveResult = mongoResult.status === "fulfilled" ? mongoResult.value : { inserted: 0, updated: 0 };
                result.savedToDb = { inserted: saveResult.inserted, updated: saveResult.updated };
            }
            return result;
        } catch (error) {
            this.logger.error(`TopCV crawl failed: ${error}`);
            return { source: "topcv", companies: [], companyCount: 0, jobCount: 0, success: false, error: (error as Error).message };
        }
    }

    // Crawl từ VietnamWorks
    static async crawlVietnamWorks(
        options?: VietnamWorksOptions & { saveToDb?: boolean }
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
                const [mongoResult, pgResult] = await Promise.allSettled([
                    JobsService.saveCompanies(companies),
                    PostgresService.saveCompanies(companies)
                ]);

                const saveResult = mongoResult.status === "fulfilled" ? mongoResult.value : { inserted: 0, updated: 0 };
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
        const [jobgoResult, vietnamworksResult, topcvResult] = await Promise.allSettled([
            this.crawlJobGo({ ...options?.jobgo, saveToDb: options?.saveToDb }),
            this.crawlVietnamWorks({ ...options?.vietnamworks, saveToDb: options?.saveToDb }),
            this.crawlTopCV({ ...options?.topcv, saveToDb: options?.saveToDb }),
        ]);

        const allSettled = [jobgoResult, vietnamworksResult, topcvResult];
        const sources = ["jobgo", "vietnamworks", "topcv"];

        for (let i = 0; i < allSettled.length; i++) {
            const r = allSettled[i];
            if (r.status === "fulfilled") {
                results.push(r.value);
            } else {
                results.push({ source: sources[i], companies: [], companyCount: 0, jobCount: 0, success: false, error: r.reason?.message || "Unknown error" });
            }
        }

        const totalCompanies = results.reduce((sum, r) => sum + r.companyCount, 0);
        const totalJobs = results.reduce((sum, r) => sum + r.jobCount, 0);
        this.logger.log(
            `✅ All crawls completed: ${totalCompanies} total companies, ${totalJobs} total jobs`
        );

        return results;
    }
}
