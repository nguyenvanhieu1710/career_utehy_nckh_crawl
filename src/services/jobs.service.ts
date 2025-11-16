import { Company } from "../models";
import { CompanyInput, JobInput } from "../interfaces";
import { JobGoCrawler } from "../crawlers";

interface JobQueryParams {
  keyword?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export class JobsService {
  static async getJobs(queryParams: JobQueryParams): Promise<{
    jobs: JobInput[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { keyword, location, page = 1, limit = 10 } = queryParams;
    const query: any = {};

    if (keyword) {
      query["jobs.title"] = { $regex: keyword, $options: "i" };
    }
    if (location) {
      query["jobs.location"] = { $regex: location, $options: "i" };
    }

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    const companies = await Company.find(query)
      .lean()
      .skip(skip)
      .limit(limitNum);

    const jobs = companies.flatMap((company) => company.jobs);
    const totalJobs = companies.reduce(
      (sum, company) => sum + company.jobs.length,
      0
    );

    return {
      jobs,
      total: totalJobs,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalJobs / limitNum),
    };
  }

  static async saveCompanies(
    companies: CompanyInput[]
  ): Promise<{
    success: boolean;
    inserted: number;
    updated: number;
    error?: any;
  }> {
    if (!companies.length) {
      console.warn("No companies to save.");
      return { success: true, inserted: 0, updated: 0 };
    }

    try {
      const operations = companies.map((company) => ({
        updateOne: {
          filter: { id: company.id },
          update: { $set: { ...company, jobs: company.jobs } },
          upsert: true,
        },
      }));

      const result = await Company.bulkWrite(operations, { ordered: false });

      // console.log(
      //   `✅ Saved companies: inserted=${result.upsertedCount}, updated=${result.modifiedCount}`
      // );

      return {
        success: true,
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
      };
    } catch (error) {
      console.error("❌ Error during bulk company save:", error);
      return { success: false, inserted: 0, updated: 0, error };
    }
  }

  static async triggerCrawl(): Promise<{
    companies: CompanyInput[];
    jobCount: number;
    companyCount: number;
  }> {
    try {
      const companies = await JobGoCrawler.crawl();
      // Save to database
      const saveResult = await this.saveCompanies(companies);
      if (!saveResult.success) {
        throw new Error(
          `Failed to save companies: ${saveResult.error?.message}`
        );
      }
      const jobCount = companies.reduce(
        (sum, company) => sum + company.jobs.length,
        0
      );
      return { companies, jobCount, companyCount: companies.length };
    } catch (error) {
      console.error("Error triggering crawl:", error);
      throw error;
    }
  }
}
