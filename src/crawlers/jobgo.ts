import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import {
  CompanyInput,
  JobInput,
  ICrawler,
  CrawlerOptions,
} from "../interfaces";
import { Logger } from "../utils/logger";

export class JobGoCrawler implements ICrawler {
  static readonly logger = Logger;
  static readonly BASE_URL = "https://jobsgo.vn";
  static readonly DEFAULT_LIST_URL = "https://jobsgo.vn/viec-lam.html";

  // Hàm chuyển chuỗi thành slug
  private static toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Common sleep for evasion
  private static async jitterSleep(minMs: number, maxMs: number) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((r) => setTimeout(r, delay));
  }

  // --- Map industries ---
  private static mapVietnameseToIndustryEnum(
    vietnameseIndustries: string[],
  ): string[] {
    const industryMapping: Record<string, string> = {
      "Giáo dục": "EDUCATION",
      "Công nghệ thông tin": "TECHNOLOGY",
      "Tài chính": "FINANCE",
      "Y tế": "HEALTHCARE",
      "Bán lẻ": "RETAIL",
      "Sản xuất": "MANUFACTURING",
      "Tư vấn": "CONSULTING",
      "Bất động sản": "REAL_ESTATE",
      "Xây dựng": "CONSTRUCTION",
    };

    return vietnameseIndustries
      .map((i) => industryMapping[i.trim()] || "OTHER")
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  // --- Crawl 1 trang danh sách job ---
  private static async crawlListPage(
    page: Page,
    pageUrl: string,
  ): Promise<{
    jobs: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }>;
  }> {
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Cố gắng đợi trang load
    try {
      await page.waitForSelector(".job-list .job-card", { timeout: 15000 });
      // Scroll to trigger lazy images if any
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      // ignore
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const jobCardCount = $(".job-list .job-card").length;
    this.logger.log(`Found ${jobCardCount} job cards on page.`);

    const items: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }> = [];

    $(".job-list .col-grid").each((_, el) => {
      try {
        const urlA = $(el).find("a.text-decoration-none").first();
        const jHref = urlA.attr("href") || "";
        const sourceUrl = jHref.startsWith("http") ? jHref : `https://jobsgo.vn${jHref}`;
        
        let jobId = $(el).find(".job-card").attr("data-id");
        if (!jobId) {
          const m = sourceUrl.match(/-([0-9]+)\.html/);
          jobId = m ? m[1] : uuidv4();
        }

        const title = $(el).find("h3.job-title").text().trim();
        const companyName = $(el).find(".company-title").text().trim();
        const companyLogo = $(el).find(".image-wrapper img").attr("src") || "";
        
        const salaryText = $(el).find(".mt-1.text-primary span").first().text().trim();
        const locationText = $(el).find(".mt-1.text-primary span").last().text().trim();

        if (!title || !companyName) return;

        const companySlug = this.toSlug(companyName);
        const jobSlug = `${this.toSlug(title)}-${companySlug}-jobgo-${jobId}`;

        const jobData: Partial<JobInput> = {
          id: jobId,
          title,
          slug: jobSlug,
          source: "jobgo",
          sourceUrl,
          salaryDisplay: salaryText,
          location: locationText,
          status: "OPEN",
        };

        items.push({
          jobData,
          companyKey: companySlug,
          companyData: {
            name: companyName,
            logo: companyLogo,
            slug: companySlug,
          },
        });
      } catch (e) {
        // skip error items
      }
    });

    return { jobs: items };
  }

  // Hàm crawl detail page
  private static async fetchJobDetail(
    page: Page,
    url: string,
  ): Promise<{
    description: string;
    requirements: string[];
    benefits: string[];
    jobLevel?: string;
    yearsOfExperience?: number;
  }> {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      const html = await page.content();
      const $ = cheerio.load(html);

      const res = {
        description: "",
        requirements: [] as string[],
        benefits: [] as string[],
        jobLevel: undefined as string | undefined,
        yearsOfExperience: undefined as number | undefined,
      };

      // In JobGo, Job detail content is usually split by headers h3 inside .job-detail-card or similar
      const descBox = $(".job-detail-card, .job-detail-content").first();
      res.description = descBox.text().trim();

      // You mentioned you will code fetch_company_detail and refine fetch_job_detail later, 
      // so this provides the basic skeleton.

      return res;
    } catch {
      return { description: "", requirements: [], benefits: [] };
    }
  }

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    let browser: Browser | null = null;

    try {
      let url = options?.url;

      if (!url && options?.industries && options.industries.length > 0) {
        // VD: 'tai-chinh-ngan-hang-chung-khoan'
        // Ở JobsGo URL mẫu: https://jobsgo.vn/viec-lam-{slug}.html
        // Chúng ta giả định industry gửi lên là dạng slug giống user cung cấp.
        const industryStr = options.industries[0];
        url = `https://jobsgo.vn/viec-lam-${industryStr}.html`;
      }

      url = url || JobGoCrawler.DEFAULT_LIST_URL;

      const maxPages = options?.maxPages || 1;
      const fetchDetail = options?.fetchDetail || false;
      const existingCompanies = options?.existingCompanies || new Set<string>();
      const existingJobs = options?.existingJobs || new Set<string>();

      JobGoCrawler.logger.log(
        `Starting JobGo crawler from: ${url}`,
      );

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 768 });

      const companiesMap = new Map<
        string,
        Omit<CompanyInput, "id" | "locations" | "industries"> & { jobs: JobInput[] }
      >();
      let skippedJobsCount = 0;

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let pageUrl = url;
        if (pageNum > 1) {
          pageUrl = url.includes("?") 
            ? `${url}&page=${pageNum}`
            : `${url}?page=${pageNum}`;
        }

        JobGoCrawler.logger.log(`Crawling page ${pageNum}/${maxPages}: ${pageUrl}`);

        try {
          const rawResults = await JobGoCrawler.crawlListPage(page, pageUrl);
          const pageJobs = rawResults.jobs || [];

          if (pageJobs.length === 0) {
            JobGoCrawler.logger.log(
              `No jobs found on page ${pageNum}, stopping list crawl.`,
            );
            break;
          }

          JobGoCrawler.logger.log(
            `Processing ${pageJobs.length} jobs (extracting details may take a few minutes)...`,
          );

          for (const { jobData, companyKey, companyData } of pageJobs) {
            const jobId = jobData.id || "unknown";

            if (existingJobs.has(jobId)) {
              skippedJobsCount++;
              continue;
            }

            let fullJob: JobInput = {
              ...jobData,
            } as JobInput;

            if (fetchDetail && jobData.sourceUrl) {
              const detail = await JobGoCrawler.fetchJobDetail(
                page,
                jobData.sourceUrl,
              );

              fullJob = {
                ...fullJob,
                description: detail.description || fullJob.description,
                requirements: detail.requirements,
                jobLevelName: detail.jobLevel,
                yearsOfExperience: detail.yearsOfExperience,
                benefits: detail.benefits,
                descriptionRaw: detail.description,
                descriptionSum: (detail.description || "").substring(0, 500),
              };

              await JobGoCrawler.jitterSleep(800, 1500);
            }

            if (!companiesMap.has(companyKey)) {
              companiesMap.set(companyKey, {
                ...companyData,
                jobs: [],
              });
            }
            companiesMap.get(companyKey)!.jobs.push(fullJob);
            existingJobs.add(jobId);
          }

          await JobGoCrawler.jitterSleep(2000, 4000);
        } catch (err) {
          JobGoCrawler.logger.error(`Error on page ${pageNum}: ${err}`);
          break;
        }
      }

      // Convert Map to Array of CompanyInput
      const results: CompanyInput[] = [];
      for (const [key, mapData] of companiesMap.entries()) {
        if (existingCompanies.has(key)) {
          // If we want to strictly filter out companies, but wait, VW approach allows same company new jobs
        }

        const allLocations = mapData.jobs
          .map((job) => job.location)
          .filter((loc): loc is string => !!loc && loc.trim() !== "");
        const uniqueLocations = [...new Set(allLocations)];

        results.push({
          id: uuidv4(),
          name: mapData.name,
          slug: mapData.slug,
          logo: mapData.logo,
          locations: uniqueLocations,
          industries: [],
          jobs: mapData.jobs,
        } as CompanyInput);
      }

      const totalJobsMapped = results.reduce(
        (sum, c) => sum + c.jobs.length,
        0,
      );

      JobGoCrawler.logger.log(`\n=== JOBGO CRAWL COMPLETED ===`);
      JobGoCrawler.logger.log(`Total jobs processed: ${totalJobsMapped}`);
      JobGoCrawler.logger.log(`Total jobs skipped: ${skippedJobsCount}`);
      JobGoCrawler.logger.log(`Total companies: ${results.length}\n`);

      return results;
    } catch (error) {
      JobGoCrawler.logger.error("JobGo Crawl Exception:", error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
