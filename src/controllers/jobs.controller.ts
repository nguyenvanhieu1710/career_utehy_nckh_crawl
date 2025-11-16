import { Request, Response } from "express";
import { JobsService } from "../services";

export class JobsController {
  static async getJobs(req: Request, res: Response) {
    try {
      const queryParams = {
        keyword: req.query.keyword as string,
        location: req.query.location as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await JobsService.getJobs(queryParams);

      res.status(200).json({
        data: result.jobs,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: {
          message: "Internal server error",
          details: (error as Error).message,
        },
      });
    }
  }

  static async triggerCrawl(req: Request, res: Response) {
    try {
      const { companies, jobCount, companyCount } =
        await JobsService.triggerCrawl();
      res.status(200).json({
        data: { companies, jobCount, companyCount },
        message: "Crawl completed successfully, data not saved to database",
      });
    } catch (error) {
      res.status(500).json({
        error: {
          message: "Failed to trigger crawl",
          details: (error as Error).message,
        },
      });
    }
  }
}
