import { Request, Response } from "express";
import { JobsMongoService, JobsPgService } from "../services";


export class JobsController {
  static async getJobs(req: Request, res: Response) {
    try {
      const queryParams = {
        keyword: req.query.keyword as string,
        location: req.query.location as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      // Toggle between MongoDB and Postgres here
      // const result = await JobsMongoService.getJobs(queryParams); // MongoDB
      const result = await JobsPgService.getJobs(queryParams); // PostgreSQL


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
}
