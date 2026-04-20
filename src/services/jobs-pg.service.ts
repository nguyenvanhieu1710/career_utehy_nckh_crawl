import { AppDataSource } from "../config/postgres.config";
import { CompanyEntity } from "../entities/company.entity";
import { JobEntity } from "../entities/job.entity";
import { CompanyInput } from "../interfaces";
import { v4 as uuidv4 } from "uuid";

export class JobsPgService {
  private static truncate(value: string | undefined | null, max: number): string {
    const v = (value || "").toString();
    return v.length > max ? v.slice(0, max) : v;
  }

  static async saveCompanies(companies: CompanyInput[]): Promise<{
    success: boolean;
    inserted: number;
    updated: number;
    error?: any;
  }> {
    if (!AppDataSource.isInitialized) {
      console.warn("PostgreSQL not connected. Skipping Postgres save.");
      return { success: false, inserted: 0, updated: 0, error: "Not initialized" };
    }

    const companyRepo = AppDataSource.getRepository(CompanyEntity);
    const jobRepo = AppDataSource.getRepository(JobEntity);
    let inserted = 0,
      updated = 0;

    try {
      for (const companyInput of companies) {
        // Tìm company theo slug
        let company = await companyRepo.findOneBy({ slug: companyInput.slug });
        
        if (company) {
          // Update
          company.name = companyInput.name || "";
          company.logo_url = companyInput.logo || "";
          company.website = companyInput.website || "";
          company.description = companyInput.description || "";
          company.industry = companyInput.industries?.[0] || ""; // Lấy tạm ngành đầu tiên
          company.sub_industries = companyInput.industries || [];
          company.size = companyInput.companySize || "";
          company.locations = companyInput.locations || [];
          company.email = companyInput.contactEmail || "";
          company.support_email = companyInput.supportEmail || "";
          company.phone = companyInput.phone || "";
          
          await companyRepo.save(company);
          updated++;
        } else {
          // Insert
          company = companyRepo.create({
            id: companyInput.id.length === 36 ? companyInput.id : uuidv4(), // Đảm bảo UUID hợp lệ
            slug: companyInput.slug,
            name: companyInput.name || "",
            logo_url: companyInput.logo || "",
            website: companyInput.website || "",
            description: companyInput.description || "",
            industry: companyInput.industries?.[0] || "",
            sub_industries: companyInput.industries || [],
            size: companyInput.companySize || "",
            locations: companyInput.locations || [],
            email: companyInput.contactEmail || "",
            support_email: companyInput.supportEmail || "",
            phone: companyInput.phone || "",
          });
          await companyRepo.save(company);
          inserted++;
        }

        // Lưu jobs
        for (const jobInput of companyInput.jobs) {
          let job = await jobRepo.findOneBy({ slug: jobInput.slug });
          
          const jobData = {
            title: this.truncate(jobInput.title, 200),
            company_id: company.id,
            location: this.truncate(jobInput.location, 150),
            work_arrangement: this.truncate(jobInput.workArrangement, 50),
            job_type: this.truncate(jobInput.jobType, 20),
            salary_display: this.truncate(jobInput.salaryDisplay, 100),
            salary_min: jobInput.salaryMin || 0,
            salary_max: jobInput.salaryMax || 0,
            skills: jobInput.skills || [],
            requirements: jobInput.requirementsSum || jobInput.requirements?.join(" ") || "",
            description: jobInput.description || "",
            benefits: jobInput.benefits?.join("\n") || "",
            job_level: this.truncate(jobInput.jobLevelName, 100),
            years_of_experience: jobInput.yearsOfExperience || 0,
            status: this.truncate(jobInput.status?.toLowerCase(), 20) || "active",
            url_source: this.truncate(jobInput.sourceUrl, 255),
          };

          if (job) {
            Object.assign(job, jobData);
            await jobRepo.save(job);
          } else {
            job = jobRepo.create({
              ...jobData,
              id: uuidv4(),
              slug: this.truncate(jobInput.slug, 255),
            });
            await jobRepo.save(job);
          }
        }
      }

      console.log(`✅ Saved to PostgreSQL: inserted=${inserted}, updated=${updated}`);
      return { success: true, inserted, updated };
    } catch (error) {
      console.error("❌ Error during PostgreSQL bulk save:", error);
      return { success: false, inserted, updated, error: (error as Error).message };
    }
  }

  static async getJobs(queryParams: {
    keyword?: string;
    location?: string;
    page?: number;
    limit?: number;
  }) {
    if (!AppDataSource.isInitialized) {
      return { jobs: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const { keyword, location, page = 1, limit = 10 } = queryParams;
    const jobRepo = AppDataSource.getRepository(JobEntity);

    const queryBuilder = jobRepo.createQueryBuilder("job")
      .leftJoinAndSelect("job.company", "company");

    if (keyword) {
      queryBuilder.andWhere("job.title ILIKE :keyword OR company.name ILIKE :keyword", { keyword: `%${keyword}%` });
    }

    if (location) {
      queryBuilder.andWhere("job.location ILIKE :location", { location: `%${location}%` });
    }

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);

    const [jobs, total] = await queryBuilder
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return {
      jobs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}
