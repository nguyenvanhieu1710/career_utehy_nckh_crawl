import { AppDataSource } from "../config/postgres.config";
import { CompanyEntity } from "../entities/company.entity";
import { JobEntity } from "../entities/job.entity";
import { CompanyInput } from "../interfaces";
import { v4 as uuidv4 } from "uuid";

export class PostgresService {
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
            title: jobInput.title || "",
            company_id: company.id, // reference tới postgres company id
            location: jobInput.location || "",
            work_arrangement: jobInput.workArrangement || "",
            job_type: jobInput.jobType || "",
            salary_display: jobInput.salaryDisplay || "",
            salary_min: jobInput.salaryMin || 0,
            salary_max: jobInput.salaryMax || 0,
            skills: jobInput.skills || [],
            requirements: jobInput.requirementsSum || jobInput.requirements?.join(" ") || "",
            description: jobInput.description || "",
            status: jobInput.status?.toLowerCase() || "active",
            url_source: jobInput.sourceUrl || "",
          };

          if (job) {
            Object.assign(job, jobData);
            await jobRepo.save(job);
          } else {
            job = jobRepo.create({
              ...jobData,
              id: uuidv4(), // Job trong crawler thường id dạng `job-1234`, nên dùng UUID format
              slug: jobInput.slug,
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
}
