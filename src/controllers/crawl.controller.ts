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
  // Body: { url?: string, industries?: string[], maxPages?: number, saveToDb?: boolean }
  static async crawlJobGo(req: Request, res: Response) {
    try {
      const { url, industries, maxPages, saveToDb = false } = req.body;

      const result = await CrawlService.crawlJobGo({
        baseUrl: url,
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
  // Body: { url?: string, userId?: string, saveToDb?: boolean }
  static async crawlVietnamWorks(req: Request, res: Response) {
    try {
      const { url, userId, saveToDb = false } = req.body;

      const result = await CrawlService.crawlVietnamWorks({
        url,
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

  // POST /api/crawl/topcv
  // Body: { url?: string, saveToDb?: boolean }
  static async crawlTopCV(req: Request, res: Response) {
    try {
      const { url, maxPages, fetchDetail, saveToDb = false } = req.body;

      const result = await CrawlService.crawlTopCV({
        url,
        maxPages,
        fetchDetail,
        saveToDb,
      });

      if (!result.success) {
        return res.status(500).json({
          error: {
            message: "TopCV crawl failed",
            details: result.error,
          },
        });
      }

      res.status(200).json({
        data: {
          source: result.source,
          companyCount: result.companyCount,
          jobCount: result.jobCount,
          savedToDb: result.savedToDb,
        },
        message: "TopCV crawl completed successfully",
      });
    } catch (error) {
      res.status(500).json({
        error: {
          message: "Failed to crawl TopCV",
          details: (error as Error).message,
        },
      });
    }
  }
}
