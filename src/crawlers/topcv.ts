import axios from "axios";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { CompanyInput, JobInput } from "../interfaces";

export class TopCVCrawler {
  private static readonly logger = console;
  private static readonly BASE_URL = "https://www.topcv.vn";
  private static readonly DEFAULT_LIST_URL = "https://www.topcv.vn/viec-lam";

  // --- Helpers ---

  private static toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private static buildRequestHeaders() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: "https://www.topcv.vn/",
      "Cache-Control": "no-cache",
      "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
    };
  }

  private static extractSkills(text: string): string[] {
    const SKILLS = [
      "javascript",
      "typescript",
      "python",
      "java",
      "c#",
      "c++",
      "ruby",
      "go",
      "rust",
      "php",
      "react",
      "vue",
      "angular",
      "nextjs",
      "nodejs",
      "express",
      "nestjs",
      "spring boot",
      "django",
      "flask",
      "laravel",
      "asp.net",
      "html",
      "css",
      "sass",
      "tailwind",
      "bootstrap",
      "mysql",
      "postgresql",
      "mongodb",
      "redis",
      "elasticsearch",
      "docker",
      "kubernetes",
      "aws",
      "gcp",
      "azure",
      "ci/cd",
      "git",
      "restful",
      "graphql",
      "microservices",
      "devops",
      "figma",
      "photoshop",
      "illustrator",
      "ui/ux",
      "machine learning",
      "deep learning",
      "tensorflow",
      "pytorch",
      "ai",
      "sql",
      "nosql",
      "agile",
      "scrum",
      "tiếng anh",
      "english",
      "communication",
      "leadership",
    ];
    const lower = text.toLowerCase();
    return SKILLS.filter((s) => lower.includes(s));
  }

  private static parseSalary(salaryText: string): {
    salaryMin?: number;
    salaryMax?: number;
    salaryDisplay: string;
  } {
    const display = salaryText.trim();
    if (
      !display ||
      display.toLowerCase().includes("thỏa thuận") ||
      display.toLowerCase().includes("negotiate")
    ) {
      return { salaryDisplay: "Thỏa thuận" };
    }

    // Match "10 - 20 triệu" or "10-20 triệu" or "$500 - $1000"
    const rangeMatch = display.match(/([0-9,]+)\s*[-–]\s*([0-9,]+)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1].replace(/,/g, ""));
      const max = parseInt(rangeMatch[2].replace(/,/g, ""));
      return { salaryMin: min, salaryMax: max, salaryDisplay: display };
    }

    const singleMatch = display.match(/([0-9,]+)/);
    if (singleMatch) {
      const val = parseInt(singleMatch[1].replace(/,/g, ""));
      return { salaryMin: val, salaryMax: val, salaryDisplay: display };
    }

    return { salaryDisplay: display };
  }

  // --- Fetch job detail page để lấy description ---
  private static async fetchJobDetail(jobUrl: string): Promise<{
    description: string;
    requirements: string[];
    benefits: string;
    expiresAt?: string;
  }> {
    try {
      const { data: html } = await axios.get(jobUrl, {
        headers: this.buildRequestHeaders(),
        timeout: 10000,
      });
      const $ = cheerio.load(html);

      const description =
        $(".job-description__item--content").first().text().trim() ||
        $(".job__description").text().trim() ||
        "";

      const requirementsText =
        $(".job-description__item--content").eq(1).text().trim() ||
        $(".job__requirements").text().trim() ||
        "";

      const requirements = requirementsText
        ? requirementsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : [];

      const benefits =
        $(".job-description__item--content").eq(2).text().trim() ||
        $(".job__benefit").text().trim() ||
        "";

      const expiresAt =
        $(".job-detail__info--deadline")
          .text()
          .replace(/[^0-9/\-]/g, "")
          .trim() || undefined;

      return { description, requirements, benefits, expiresAt };
    } catch {
      return { description: "", requirements: [], benefits: "" };
    }
  }

  // --- Crawl 1 trang danh sách job ---
  private static async crawlListPage(pageUrl: string): Promise<{
    jobs: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }>;
  }> {
    const { data: html } = await axios.get(pageUrl, {
      headers: this.buildRequestHeaders(),
      timeout: 15000,
    });
    const fs = await import("fs");
    fs.writeFileSync("debug.html", html);
    const $ = cheerio.load(html);
    console.log("Total job cards found:", $("[data-job-id]").length);

    const items: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }> = [];

    // Selector chính cho job card trên https://www.topcv.vn/viec-lam
    $(".job-item-search-result[data-job-id]").each((_, el) => {
      try {
        const $el = $(el);

        const jobId = $el.attr("data-job-id") || uuidv4();

        // Title
        const title = $el.find("h3.title a span").first().text().trim();
        if (!title) return;

        // URL
        const jobHref = $el.find("h3.title a").attr("href") || "";
        const sourceUrl = jobHref.startsWith("http")
          ? jobHref
          : `${this.BASE_URL}${jobHref}`;

        // Company
        const companyName =
          $el.find("a.company span.company-name").text().trim() ||
          "Unknown Company";
        const companyLogoSrc =
          $el.find(".avatar img").attr("data-src") ||
          $el.find(".avatar img").attr("src") ||
          "";
        const companySlug = this.toSlug(companyName);

        // Salary - có 2 nơi hiển thị, lấy từ label.salary
        const salaryText =
          $el.find(".label-content label.salary span").text().trim() ||
          $el.find("label.title-salary").text().trim() ||
          "";

        // Location
        const location =
          $el.find("label.address span.city-text").text().trim() || "";

        // Experience - thông tin bổ sung
        const experience = $el.find("label.exp span").text().trim() || "";

        // Tags
        const tags = $el
          .find(".tag .item-tag")
          .map((_, tag) => $(tag).text().trim())
          .get()
          .filter(Boolean);

        const slug = this.toSlug(title) + "-" + jobId;

        const { salaryMin, salaryMax, salaryDisplay } =
          this.parseSalary(salaryText);
        const jobType = tags[0] || ""; // Tạm lấy tag đầu làm jobType nếu có

        const jobData: Partial<JobInput> = {
          id: jobId,
          title,
          slug,
          source: "topcv",
          location,
          salaryDisplay,
          salaryMin,
          salaryMax,
          jobType: jobType || undefined,
          status: "OPEN",
          sourceUrl,
          titleSum: title,
          locationSum: location,
          requirementsSum: experience ? [experience].join("; ") : undefined,
        };

        items.push({
          jobData,
          companyKey: companySlug,
          companyData: {
            name: companyName,
            logo: companyLogoSrc,
            slug: companySlug,
          },
        });
      } catch (err) {
        // bỏ qua item lỗi
      }
    });

    return { jobs: items };
  }

  // --- Main crawl method ---
  static async crawl(options?: {
    url?: string;
    maxPages?: number;
    fetchDetail?: boolean; // Có crawl thêm trang detail để lấy description không
  }): Promise<CompanyInput[]> {
    const {
      url = this.DEFAULT_LIST_URL,
      maxPages = 3,
      fetchDetail = false,
    } = options || {};

    this.logger.log(`Starting TopCV crawler from: ${url}`);

    const companiesMap = new Map<
      string,
      { name: string; logo: string; slug: string; jobs: JobInput[] }
    >();

    // Nếu url là trang cụ thể (1 trang), chỉ crawl đó
    const isSinglePage = url !== this.DEFAULT_LIST_URL || maxPages === 1;
    const totalPages = isSinglePage ? 1 : maxPages;

    for (let page = 1; page <= totalPages; page++) {
      const pageUrl = isSinglePage ? url : `${url}?page=${page}`;

      this.logger.log(`Crawling page ${page}/${totalPages}: ${pageUrl}`);

      try {
        const { jobs: rawItems } = await this.crawlListPage(pageUrl);

        if (rawItems.length === 0) {
          this.logger.log(`No jobs found on page ${page}, stopping.`);
          break;
        }

        this.logger.log(`Found ${rawItems.length} jobs on page ${page}`);

        for (const { jobData, companyKey, companyData } of rawItems) {
          let fullJob: JobInput = {
            id: jobData.id || uuidv4(),
            title: jobData.title || "",
            slug: jobData.slug || this.toSlug(jobData.title || ""),
            ...jobData,
          } as JobInput;

          // Tùy chọn: crawl detail page để lấy description đầy đủ
          if (fetchDetail && jobData.sourceUrl) {
            this.logger.log(`  Fetching detail: ${jobData.sourceUrl}`);
            const detail = await this.fetchJobDetail(jobData.sourceUrl);
            const skills = this.extractSkills(
              detail.description + " " + detail.requirements.join(" "),
            );

            fullJob = {
              ...fullJob,
              description: detail.description,
              requirements: detail.requirements,
              skills,
              descriptionSum: detail.description.substring(0, 500),
              requirementsSum: detail.requirements.slice(0, 5).join("; "),
              skillsSum: skills.join(", "),
              expiresAt: detail.expiresAt,
            };

            await new Promise((r) => setTimeout(r, 500)); // tránh rate limit
          }

          if (!companiesMap.has(companyKey)) {
            companiesMap.set(companyKey, {
              ...companyData,
              jobs: [],
            });
          }
          companiesMap.get(companyKey)!.jobs.push(fullJob);
        }

        if (!isSinglePage) {
          await new Promise((r) => setTimeout(r, 1000)); // delay giữa các trang
        }
      } catch (err) {
        this.logger.error(`Error on page ${page}: ${err}`);
        break;
      }
    }

    // Chuyển Map thành CompanyInput[]
    const results: CompanyInput[] = [];
    for (const [, company] of companiesMap) {
      results.push({
        id: uuidv4(),
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        industries: [],
        jobs: company.jobs,
      });
    }

    this.logger.log(
      `TopCV crawl completed: ${results.length} companies, ${results.reduce((s, c) => s + c.jobs.length, 0)} jobs`,
    );

    return results;
  }
}
