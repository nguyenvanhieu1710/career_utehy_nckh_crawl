import { Request, Response } from "express";
import { CrawlService } from "../services/crawl.service";

export class CrawlController {
  // GET /api/crawl/sources - Lấy danh sách các nguồn crawl có sẵn
  static async getSources(req: Request, res: Response) {
    try {
      const sources = CrawlService.getAvailableSources();
      return res.status(200).json({
        data: sources,
        message: "Available crawl sources",
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: "Failed to get crawl sources",
          details: (error as Error).message,
        },
      });
    }
  }

  // POST /api/crawl/jobgo - Crawl từ JobGo
  // Body: { url?: string, industries?: string[], maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean }
  static async crawlJobGo(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail = false,
        saveToDb = false,
      } = req.body;

      // [DEVELOPER MODE: SYNC - Un-comment below to see full JSON results in Postman]
      /*
      const result = await CrawlService.crawlJobGo({ url, maxPages, fetchDetail, saveToDb });
      return res.status(200).json(result);
      */

      // [PRODUCTION MODE: ASYNC]
      CrawlService.crawlJobGo({
        url,
        maxPages,
        fetchDetail,
        saveToDb,
      }).then(result => {
        if (result.success) {
          console.log(`[Async] JobGo crawl completed: ${result.jobCount} jobs found.`);
        } else {
          console.error(`[Async] JobGo crawl failed: ${result.error}`);
        }
      }).catch(err => {
        console.error(`[Async] Unhandled error in JobGo crawl: ${err.message}`);
      });

      // Return immediately
      return res.status(202).json({
        message: "JobGo crawl triggered successfully and is running in background",
        status: "accepted"
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: "Failed to crawl JobGo",
          details: (error as Error).message,
        },
      });
    }
  }

  // POST /api/crawl/vietnamworks - Crawl từ VietnamWorks
  // Body: { url?: string, maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean }
  static async crawlVietnamWorks(req: Request, res: Response) {
    try {
      const { url, maxPages, fetchDetail, saveToDb = false } = req.body;

      // [DEVELOPER MODE: SYNC - Un-comment below to see full JSON results in Postman]
      /*
      const result = await CrawlService.crawlVietnamWorks({ url, maxPages, fetchDetail, saveToDb });
      return res.status(200).json(result);
      */

      // [PRODUCTION MODE: ASYNC]
      CrawlService.crawlVietnamWorks({
        url,
        maxPages,
        fetchDetail,
        saveToDb,
      }).then(result => {
        if (result.success) {
          console.log(`[Async] VietnamWorks crawl completed: ${result.jobCount} jobs found.`);
        } else {
          console.error(`[Async] VietnamWorks crawl failed: ${result.error}`);
        }
      }).catch(err => {
        console.error(`[Async] Unhandled error in VietnamWorks crawl: ${err.message}`);
      });

      // Return immediately
      return res.status(202).json({
        message: "VietnamWorks crawl triggered successfully and is running in background",
        status: "accepted"
      });
    } catch (error) {
      return res.status(500).json({
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

      // [DEVELOPER MODE: SYNC - Un-comment below to see full JSON results in Postman]
      /*
      const result = await CrawlService.crawlTopCV({ url, maxPages, fetchDetail, saveToDb });
      return res.status(200).json(result);
      */

      // [PRODUCTION MODE: ASYNC]
      CrawlService.crawlTopCV({
        url,
        maxPages,
        fetchDetail,
        saveToDb,
      }).then(result => {
        if (result.success) {
          console.log(`[Async] TopCV crawl completed: ${result.jobCount} jobs found.`);
        } else {
          console.error(`[Async] TopCV crawl failed: ${result.error}`);
        }
      }).catch(err => {
        console.error(`[Async] Unhandled error in TopCV crawl: ${err.message}`);
      });

      // Return immediately
      return res.status(202).json({
        message: "TopCV crawl triggered successfully and is running in background",
        status: "accepted"
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: "Failed to crawl TopCV",
          details: (error as Error).message,
        },
      });
    }
  }

  // POST /api/crawl/itviec
  // Body: { url?: string, maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean }
  static async crawlITviec(req: Request, res: Response) {
    try {
      const { url, maxPages, fetchDetail, saveToDb = false } = req.body;

      // [DEVELOPER MODE: SYNC - Un-comment below to see full JSON results in Postman]
      /*
      const result = await CrawlService.crawlITviec({ url, maxPages, fetchDetail, saveToDb });
      return res.status(200).json(result);
      */

      // [PRODUCTION MODE: ASYNC]
      CrawlService.crawlITviec({
        url,
        maxPages,
        fetchDetail,
        saveToDb,
      }).then(result => {
        if (result.success) {
          console.log(`[Async] ITviec crawl completed: ${result.jobCount} jobs found.`);
        } else {
          console.error(`[Async] ITviec crawl failed: ${result.error}`);
        }
      }).catch(err => {
        console.error(`[Async] Unhandled error in ITviec crawl: ${err.message}`);
      });

      // Return immediately
      return res.status(202).json({
        message: "ITviec crawl triggered successfully and is running in background",
        status: "accepted"
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: "Failed to crawl ITviec",
          details: (error as Error).message,
        },
      });
    }
  }

  // POST /api/crawl/vieclam24h
  // Body: { url?: string, maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean, cssConfig: CrawlerCssConfig }
  static async crawlVieclam24h(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail,
        saveToDb = false,
        cssConfig,
      } = req.body;

      // [DEVELOPER MODE: SYNC - Un-comment below to see full JSON results in Postman]
      /*
      const result = await CrawlService.crawlVieclam24h({ url, maxPages, fetchDetail, saveToDb, cssConfig });
      return res.status(200).json(result);
      */

      // [PRODUCTION MODE: ASYNC]
      CrawlService.crawlVieclam24h({
        url,
        maxPages,
        fetchDetail,
        saveToDb,
        cssConfig,
      }).then(result => {
        if (result.success) {
          console.log(`[Async] Vieclam24h crawl completed: ${result.jobCount} jobs found.`);
        } else {
          console.error(`[Async] Vieclam24h crawl failed: ${result.error}`);
        }
      }).catch(err => {
        console.error(`[Async] Unhandled error in Vieclam24h crawl: ${err.message}`);
      });

      // Return immediately
      return res.status(202).json({
        message: "Vieclam24h crawl triggered successfully and is running in background",
        status: "accepted"
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: "Internal server error",
          details: (error as Error).message,
        },
      });
    }
  }
  // POST /api/crawl/push-job - Centralized dispatcher
  static async dispatch(req: Request, res: Response) {
    try {
      const { source, ...payload } = req.body;
      const saveToDb = payload.saveToDb !== undefined ? payload.saveToDb : true;

      if (!source) {
        return res.status(400).json({
          error: {
            message: "Missing 'source' field in request body",
          },
        });
      }

      const normalizedSource = source.toLowerCase();
      const availableSources = ["jobgo", "jobsgo", "vietnamworks", "topcv", "itviec", "vieclam24h"];
      
      if (!availableSources.includes(normalizedSource)) {
        return res.status(400).json({
          error: {
            message: `Unsupported source: ${source}`,
            availableSources: CrawlService.getAvailableSources(),
          },
        });
      }

      // [DEVELOPER MODE: SYNC DISPATCH - Un-comment below to see full JSON results in Postman]
      /*
      let syncResult;
      switch (normalizedSource) {
        case "jobgo":
        case "jobsgo":
          syncResult = await CrawlService.crawlJobGo({ ...payload, saveToDb });
          break;
        case "vietnamworks":
          syncResult = await CrawlService.crawlVietnamWorks({ ...payload, saveToDb });
          break;
        case "topcv":
          syncResult = await CrawlService.crawlTopCV({ ...payload, saveToDb });
          break;
        case "itviec":
          syncResult = await CrawlService.crawlITviec({ ...payload, saveToDb });
          break;
        case "vieclam24h":
          syncResult = await CrawlService.crawlVieclam24h({ ...payload, saveToDb });
          break;
      }
      return res.status(200).json(syncResult);
      */

      // [PRODUCTION MODE: ASYNC DISPATCH]
      // Task to run in background
      const runCrawl = async () => {
        try {
          let asyncResult;
          switch (normalizedSource) {
            case "jobgo":
            case "jobsgo":
              asyncResult = await CrawlService.crawlJobGo({ ...payload, saveToDb });
              break;
            case "vietnamworks":
              asyncResult = await CrawlService.crawlVietnamWorks({ ...payload, saveToDb });
              break;
            case "topcv":
              asyncResult = await CrawlService.crawlTopCV({ ...payload, saveToDb });
              break;
            case "itviec":
              asyncResult = await CrawlService.crawlITviec({ ...payload, saveToDb });
              break;
            case "vieclam24h":
              asyncResult = await CrawlService.crawlVieclam24h({ ...payload, saveToDb });
              break;
          }
          
          if (asyncResult?.success) {
            console.log(`[Async Dispatch] ${source} crawl completed: ${asyncResult.jobCount} jobs found.`);
          } else {
            console.error(`[Async Dispatch] ${source} crawl failed: ${asyncResult?.error}`);
          }
        } catch (err) {
          console.error(`[Async Dispatch] Critical error in ${source} crawl: ${(err as Error).message}`);
        }
      };

      // Execute in background
      runCrawl();

      // Return immediately
      return res.status(202).json({
        message: `${source} crawl triggered successfully via dispatch and is running in background`,
        status: "accepted"
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: "Internal server error during dispatch",
          details: (error as Error).message,
        },
      });
    }
  }
}
