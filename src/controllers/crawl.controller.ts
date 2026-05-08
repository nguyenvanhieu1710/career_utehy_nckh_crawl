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

  // Helper method to handle callback logic
  private static async _handleCallback(
    source: string,
    result: any,
    callbackUrl?: string,
    historyId?: string,
  ) {
    if (!callbackUrl) return;

    try {
      const payload: any = {
        source: source,
        historyId: historyId,
        timestamp: new Date().toISOString(),
      };

      if (result.success) {
        console.log(
          `[Callback] ${source} crawl completed: ${result.jobCount} jobs found.`,
        );
        payload.status = "completed";
        payload.newJobIds = result.savedToDb?.newJobIds || [];
        payload.statistics = {
          total: result.jobCount || 0,
          inserted: result.savedToDb?.inserted || 0,
          updated: result.savedToDb?.updated || 0,
          failed: (result.savedToDb as any)?.failed || 0,
          skipped: (result.savedToDb as any)?.skipped || 0,
        };
      } else {
        console.error(`[Callback] ${source} crawl failed: ${result.error}`);
        payload.status = "failed";
        payload.newJobIds = [];
        payload.error = result.error || "Unknown error occurred during crawl";
      }

      console.log(`[Callback] Sending notification to ${callbackUrl}...`);
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[Callback] Successfully notified ${callbackUrl}`);
      } else {
        const errorText = await response.text();
        console.error(
          `[Callback] Backend returned error ${response.status}: ${errorText}`,
        );
      }
    } catch (cbErr) {
      console.error(
        `[Callback] Failed to notify ${callbackUrl}:`,
        (cbErr as Error).message,
      );
    }
  }

  // POST /api/crawl/jobgo - Crawl từ JobGo
  // Body: { url?: string, industries?: string[], maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean, callbackUrl?: string }
  static async crawlJobGo(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail = false,
        saveToDb = false,
        callbackUrl,
        historyId,
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
      })
        .then((result) => {
          CrawlController._handleCallback(
            "jobgo",
            result,
            callbackUrl,
            historyId,
          );
        })
        .catch((err) => {
          console.error(
            `[Async] Unhandled error in JobGo crawl: ${err.message}`,
          );
          CrawlController._handleCallback(
            "jobgo",
            { success: false, error: err.message },
            callbackUrl,
            historyId,
          );
        });

      // Return immediately
      return res.status(202).json({
        message:
          "JobGo crawl triggered successfully and is running in background",
        status: "accepted",
        callbackRegistered: !!callbackUrl,
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
  // Body: { url?: string, maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean, callbackUrl?: string, historyId?: string }
  static async crawlVietnamWorks(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail,
        saveToDb = false,
        callbackUrl,
        historyId,
      } = req.body;

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
      })
        .then((result) => {
          CrawlController._handleCallback(
            "vietnamworks",
            result,
            callbackUrl,
            historyId,
          );
        })
        .catch((err) => {
          console.error(
            `[Async] Unhandled error in VietnamWorks crawl: ${err.message}`,
          );
          CrawlController._handleCallback(
            "vietnamworks",
            { success: false, error: err.message },
            callbackUrl,
            historyId,
          );
        });

      // Return immediately
      return res.status(202).json({
        message:
          "VietnamWorks crawl triggered successfully and is running in background",
        status: "accepted",
        callbackRegistered: !!callbackUrl,
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
  // Body: { url?: string, saveToDb?: boolean, callbackUrl?: string, historyId?: string }
  static async crawlTopCV(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail,
        saveToDb = false,
        callbackUrl,
        historyId,
      } = req.body;

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
      })
        .then((result) => {
          CrawlController._handleCallback(
            "topcv",
            result,
            callbackUrl,
            historyId,
          );
        })
        .catch((err) => {
          console.error(
            `[Async] Unhandled error in TopCV crawl: ${err.message}`,
          );
          CrawlController._handleCallback(
            "topcv",
            { success: false, error: err.message },
            callbackUrl,
            historyId,
          );
        });

      // Return immediately
      return res.status(202).json({
        message:
          "TopCV crawl triggered successfully and is running in background",
        status: "accepted",
        callbackRegistered: !!callbackUrl,
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
  // Body: { url?: string, maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean, callbackUrl?: string, historyId?: string }
  static async crawlITviec(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail,
        saveToDb = false,
        callbackUrl,
        historyId,
      } = req.body;

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
      })
        .then((result) => {
          CrawlController._handleCallback(
            "itviec",
            result,
            callbackUrl,
            historyId,
          );
        })
        .catch((err) => {
          console.error(
            `[Async] Unhandled error in ITviec crawl: ${err.message}`,
          );
          CrawlController._handleCallback(
            "itviec",
            { success: false, error: err.message },
            callbackUrl,
            historyId,
          );
        });

      // Return immediately
      return res.status(202).json({
        message:
          "ITviec crawl triggered successfully and is running in background",
        status: "accepted",
        callbackRegistered: !!callbackUrl,
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
  // Body: { url?: string, maxPages?: number, fetchDetail?: boolean, saveToDb?: boolean, cssConfig: CrawlerCssConfig, callbackUrl?: string, historyId?: string }
  static async crawlVieclam24h(req: Request, res: Response) {
    try {
      const {
        url,
        maxPages,
        fetchDetail,
        saveToDb = false,
        cssConfig,
        callbackUrl,
        historyId,
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
      })
        .then((result) => {
          CrawlController._handleCallback(
            "vieclam24h",
            result,
            callbackUrl,
            historyId,
          );
        })
        .catch((err) => {
          console.error(
            `[Async] Unhandled error in Vieclam24h crawl: ${err.message}`,
          );
          CrawlController._handleCallback(
            "vieclam24h",
            { success: false, error: err.message },
            callbackUrl,
            historyId,
          );
        });

      // Return immediately
      return res.status(202).json({
        message:
          "Vieclam24h crawl triggered successfully and is running in background",
        status: "accepted",
        callbackRegistered: !!callbackUrl,
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
      const { source, callbackUrl, ...payload } = req.body;
      const saveToDb = payload.saveToDb !== undefined ? payload.saveToDb : true;

      if (!source) {
        return res.status(400).json({
          error: {
            message: "Missing 'source' field in request body",
          },
        });
      }

      const normalizedSource = source.toLowerCase();
      const availableSources = [
        "jobgo",
        "jobsgo",
        "vietnamworks",
        "topcv",
        "itviec",
        "vieclam24h",
      ];

      if (!availableSources.includes(normalizedSource)) {
        return res.status(400).json({
          error: {
            message: `Unsupported source: ${source}`,
            availableSources: CrawlService.getAvailableSources(),
          },
        });
      }

      // [DEVELOPER MODE: SYNC - Un-comment below to see full JSON results in Postman]
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
              asyncResult = await CrawlService.crawlJobGo({
                ...payload,
                saveToDb,
              });
              break;
            case "vietnamworks":
              asyncResult = await CrawlService.crawlVietnamWorks({
                ...payload,
                saveToDb,
              });
              break;
            case "topcv":
              asyncResult = await CrawlService.crawlTopCV({
                ...payload,
                saveToDb,
              });
              break;
            case "itviec":
              asyncResult = await CrawlService.crawlITviec({
                ...payload,
                saveToDb,
              });
              break;
            case "vieclam24h":
              asyncResult = await CrawlService.crawlVieclam24h({
                ...payload,
                saveToDb,
              });
              break;
          }

          if (asyncResult) {
            CrawlController._handleCallback(
              normalizedSource,
              asyncResult,
              callbackUrl,
              payload.historyId,
            );
          }
        } catch (err) {
          console.error(
            `[Async Dispatch] Critical error in ${source} crawl: ${(err as Error).message}`,
          );
          CrawlController._handleCallback(
            normalizedSource,
            { success: false, error: (err as Error).message },
            callbackUrl,
            payload.historyId,
          );
        }
      };

      // Execute in background
      runCrawl();

      // Return immediately
      return res.status(202).json({
        message: `${source} crawl triggered successfully via dispatch and is running in background`,
        status: "accepted",
        callbackRegistered: !!callbackUrl,
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
