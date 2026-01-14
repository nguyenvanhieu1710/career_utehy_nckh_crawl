import { Request, Response } from "express";
import { CrawlService } from "../services/crawl.service";

export class CrawlController {
    // GET /api/crawl/sources - Lấy danh sách các nguồn crawl có sẵn
    static async getSources(req: Request, res: Response) {
        try {
            const sources = CrawlService.getAvailableSources();
            res.status(200).json({
                data: sources,
                message: "Available crawl sources",
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: "Failed to get crawl sources",
                    details: (error as Error).message,
                },
            });
        }
    }

    // POST /api/crawl/jobgo - Crawl từ JobGo
    static async crawlJobGo(req: Request, res: Response) {
        try {
            const { industries, maxPages, saveToDb = false } = req.body;

            const result = await CrawlService.crawlJobGo({
                industries,
                maxPages,
                saveToDb,
            });

            if (!result.success) {
                return res.status(500).json({
                    error: {
                        message: "JobGo crawl failed",
                        details: result.error,
                    },
                });
            }

            res.status(200).json({
                data: {
                    source: result.source,
                    companyCount: result.companyCount,
                    jobCount: result.jobCount,
                    companies: result.companies,
                    savedToDb: result.savedToDb,
                },
                message: "JobGo crawl completed successfully",
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: "Failed to crawl JobGo",
                    details: (error as Error).message,
                },
            });
        }
    }

    // POST /api/crawl/vietnamworks - Crawl từ VietnamWorks
    static async crawlVietnamWorks(req: Request, res: Response) {
        try {
            const { userId, saveToDb = false } = req.body;

            const result = await CrawlService.crawlVietnamWorks({
                userId,
                saveToDb,
            });

            if (!result.success) {
                return res.status(500).json({
                    error: {
                        message: "VietnamWorks crawl failed",
                        details: result.error,
                    },
                });
            }

            res.status(200).json({
                data: {
                    source: result.source,
                    companyCount: result.companyCount,
                    jobCount: result.jobCount,
                    companies: result.companies,
                    savedToDb: result.savedToDb,
                },
                message: "VietnamWorks crawl completed successfully",
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: "Failed to crawl VietnamWorks",
                    details: (error as Error).message,
                },
            });
        }
    }

    // POST /api/crawl/all - Crawl từ tất cả các nguồn
    static async crawlAll(req: Request, res: Response) {
        try {
            const { saveToDb = false, jobgo, vietnamworks } = req.body;

            const results = await CrawlService.crawlAll({
                saveToDb,
                jobgo,
                vietnamworks,
            });

            const totalCompanies = results.reduce((sum, r) => sum + r.companyCount, 0);
            const totalJobs = results.reduce((sum, r) => sum + r.jobCount, 0);
            const successCount = results.filter((r) => r.success).length;

            res.status(200).json({
                data: {
                    results,
                    summary: {
                        totalSources: results.length,
                        successfulSources: successCount,
                        totalCompanies,
                        totalJobs,
                    },
                },
                message: `Crawl completed: ${successCount}/${results.length} sources succeeded`,
            });
        } catch (error) {
            res.status(500).json({
                error: {
                    message: "Failed to crawl all sources",
                    details: (error as Error).message,
                },
            });
        }
    }
}
