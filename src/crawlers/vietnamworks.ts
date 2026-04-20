import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import {
  CompanyInput,
  JobInput,
  ICrawler,
  CrawlerOptions,
} from "../interfaces";

export class VietnamWorksCrawler implements ICrawler {
  private static readonly logger = console;
  private static readonly BASE_URL = "https://www.vietnamworks.com";
  private static readonly DEFAULT_LIST_URL =
    "https://www.vietnamworks.com/viec-lam";

  // --- Helpers (Puppeteer Stealth & Utilities) ---

  private static buildRequestHeaders() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: "https://www.vietnamworks.com/",
      "Cache-Control": "no-cache",
      "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
    };
  }

  private static async configurePage(page: Page) {
    const headers = this.buildRequestHeaders();
    if (headers["User-Agent"]) {
      await page.setUserAgent(headers["User-Agent"]);
    }

    const { "User-Agent": _ua, ...extraHeaders } = headers;
    await page.setExtraHTTPHeaders(extraHeaders as Record<string, string>);

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    await page.setViewport({ width: 1366, height: 768 });

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (
        resourceType === "image" ||
        resourceType === "font" ||
        resourceType === "media"
      ) {
        void req.abort();
        return;
      }
      void req.continue();
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      // @ts-expect-error - override in browser context
      window.chrome = window.chrome || { runtime: {} };
      Object.defineProperty(navigator, "languages", {
        get: () => ["vi-VN", "vi", "en-US", "en"],
      });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    });
  }

  private static async sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  private static async jitterSleep(minMs: number, maxMs: number) {
    const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
    await this.sleep(ms);
  }

  private static isCloudflareChallenge(html: string, title: string) {
    const t = (title || "").toLowerCase();
    if (t.includes("cloudflare") && t.includes("attention required"))
      return true;

    const h = (html || "").toLowerCase();
    return (
      h.includes("attention required") &&
      h.includes("cloudflare") &&
      (h.includes("cf-error") || h.includes("cf-chl") || h.includes("cf-ray"))
    );
  }

  // Hàm chuyển chuỗi thành slug
  private static toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private static normalizeJobType(tags: string[]): string | undefined {
    for (const t of tags) {
      const lower = t.toLowerCase();
      if (
        lower.includes("full-time") ||
        lower.includes("full time") ||
        lower.includes("toàn thời gian")
      ) {
        return "FULL_TIME";
      }
      if (
        lower.includes("part-time") ||
        lower.includes("part time") ||
        lower.includes("bán thời gian")
      ) {
        return "PART_TIME";
      }
      if (lower.includes("intern") || lower.includes("thực tập")) {
        return "INTERN";
      }
    }
    return undefined;
  }

  // Parse salary từ string, ví dụ: "$350 - $550" hoặc "Negotiable"
  private static parseSalary(salary: string): {
    salaryMin?: number;
    salaryMax?: number;
    salaryDisplay: string;
  } {
    const result: {
      salaryMin?: number;
      salaryMax?: number;
      salaryDisplay: string;
    } = {
      salaryDisplay: salary,
    };

    if (
      !salary ||
      salary.toLowerCase() === "negotiable" ||
      salary === "Thương lượng"
    ) {
      return result;
    }

    // Match pattern like "$350 - $550" or "350 - 550"
    const rangeMatch = salary.match(/\$?\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/);
    if (rangeMatch) {
      result.salaryMin = parseInt(rangeMatch[1].replace(/,/g, ""));
      result.salaryMax = parseInt(rangeMatch[2].replace(/,/g, ""));
      return result;
    }

    // Match single number
    const singleMatch = salary.match(/\$?\s*([\d,]+)/);
    if (singleMatch) {
      const value = parseInt(singleMatch[1].replace(/,/g, ""));
      result.salaryMin = value;
      result.salaryMax = value;
    }

    return result;
  }

  // Extract skills từ job description và requirements
  private static extractSkills(
    description: string,
    requirements: string,
  ): string[] {
    const keywords = [
      "excel",
      "word",
      "powerpoint",
      "photoshop",
      "canva",
      "tiktok",
      "capcut",
      "adobe",
      "marketing",
      "sales",
      "bán hàng",
      "tư vấn",
      "giao tiếp",
      "làm việc nhóm",
      "lập kế hoạch",
      "quản lý",
      "tiếng anh",
      "english",
      "kỹ năng mềm",
      "kỹ năng giao tiếp",
      "kỹ năng lãnh đạo",
      "cầu tiến",
      "chủ động",
      "sáng tạo",
      "phân tích",
      "sql",
      "python",
      "javascript",
      "nodejs",
      "java",
      "c#",
      "html",
      "css",
      "react",
      "vue",
      "angular",
      "ai",
      "machine learning",
      "seo",
      "google ads",
      "facebook ads",
      "crm",
      "erp",
      "autocad",
      "solidworks",
      "qa",
      "qc",
      "qa/qc",
      "thiết kế",
      "quản trị",
      "phân tích dữ liệu",
      "data analysis",
      "project management",
      "scrum",
      "kanban",
      "git",
      "github",
      "gitlab",
      "docker",
      "kubernetes",
      "linux",
      "windows",
      "macos",
      "telesales",
      "bảo trì",
      "bảo dưỡng",
      "bảo mật",
      "network",
      "phần mềm",
      "phần cứng",
      "công nghệ thông tin",
      "it",
      "sap",
      "oracle",
      "sql server",
      "c++",
      "typescript",
      "reactjs",
      "vuejs",
      "angularjs",
      "node.js",
      "express",
      "mongodb",
      "mysql",
      "postgresql",
      "firebase",
      "aws",
      "azure",
      "gcp",
      "cloud",
      "ci/cd",
      "microsoft office",
      "leadership",
      "communication",
      "teamwork",
      "problem solving",
      "negotiation",
      "presentation",
    ];

    const text = (description + " " + requirements).toLowerCase();
    const foundSkills = keywords.filter((kw) => text.includes(kw));
    return [...new Set(foundSkills)];
  }

  // Parse requirements từ HTML string
  private static parseRequirements(requirementHtml: string): string[] {
    if (!requirementHtml) return [];

    // Remove HTML tags và split by newlines hoặc list items
    const text = requirementHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ");

    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.length < 500);
  }

  // --- Fetch job detail page để lấy description ---
  private static async fetchJobDetail(
    page: Page,
    jobUrl: string,
  ): Promise<{
    description: string;
    requirements: string[];
    benefits: string[];
    expiresAt?: string;
    jobLevel?: string;
    yearsOfExperience?: number;
    skills?: string[];
    workAddress?: string;
  }> {
    try {
      await page.goto(jobUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Chờ content render
      try {
        await page.waitForSelector("h2", { timeout: 10000 });
      } catch {
        // ignore
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      // Helper function để lấy nội dung từ Label
      const getValueByLabel = (labelText: string) => {
        let result = "";
        $("label").each((_, el) => {
          if ($(el).text().trim().includes(labelText)) {
            result = $(el).next("p").text().trim();
          }
        });
        return result;
      };

      // 1. Trích xuất Mô tả công việc
      let description = "";
      $("h2").each((_, el) => {
        if ($(el).text().trim() === "Mô tả công việc") {
          description = $(el).next().text().trim();
        }
      });

      // 2. Trích xuất Yêu cầu công việc
      let requirements: string[] = [];
      $("h2").each((_, el) => {
        if ($(el).text().trim() === "Yêu cầu công việc") {
          const reqText = $(el).next().text().trim();
          requirements = reqText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        }
      });

      // 3. Phúc lợi
      const benefits: string[] = [];
      $(".sc-c683181c-2.fGxLZh").each((_, el) => {
        benefits.push($(el).text().trim());
      });

      // 4. Các thông tin khác theo Label
      const jobLevel = getValueByLabel("CẤP BẬC");
      const experienceStr = getValueByLabel("SỐ NĂM KINH NGHIỆM TỐI THIỂU");
      const yearsOfExperience = parseInt(experienceStr) || undefined;

      const skillsStr = getValueByLabel("KỸ NĂNG");
      const skills = skillsStr ? skillsStr.split(",").map((s) => s.trim()) : [];

      // 5. Địa điểm làm việc chi tiết
      let workAddress = "";
      $("h2").each((_, el) => {
        if ($(el).text().trim() === "Địa điểm làm việc") {
          workAddress = $(el).next().find("p").text().trim();
        }
      });

      return {
        description,
        requirements,
        benefits,
        jobLevel,
        yearsOfExperience,
        skills,
        workAddress,
      };
    } catch (err) {
      this.logger.error(`Error fetching job detail at ${jobUrl}: ${err}`);
      return { description: "", requirements: [], benefits: [] };
    }
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
    blockedByCloudflare: boolean;
  }> {
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Chờ job list xuất hiện
    try {
      await page.waitForSelector(".search_list.view_job_item", {
        timeout: 15000,
      });

      // Thêm logic scroll để load thêm item (VietnamWorks thường lazy load)
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, 1000);
        });
        await new Promise((r) => setTimeout(r, 1000));
      }
      // Scroll lên đầu để đảm bảo không lỡ item nào (nếu cần) hoặc scroll xuống hẳn
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      // ignore
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const jobCardCount = $(".search_list.view_job_item").length;
    this.logger.log(`Found ${jobCardCount} job cards on page.`);

    let blockedByCloudflare = false;
    if (jobCardCount === 0) {
      const pageTitle = await page.title();
      blockedByCloudflare = this.isCloudflareChallenge(html, pageTitle);
    }

    const items: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }> = [];

    $(".search_list.view_job_item").each((_, el) => {
      try {
        const $el = $(el);

        // Title and URL
        const $titleA = $el.find("h2 a");
        const title = $titleA
          .text()
          .replace(/^Mới\s*/i, "")
          .trim();
        const jobHref = $titleA.attr("href") || "";
        const sourceUrl = jobHref.startsWith("http")
          ? jobHref
          : `${this.BASE_URL}${jobHref}`;

        // Job ID from URL (e.g., ...-2042741-jv)
        const idMatch = jobHref.match(/-(\d+)-jv/);
        const jobId = idMatch ? idMatch[1] : uuidv4();

        // Company
        const $companyA = $el.find(".sc-cpgxJx.gUZzDT a");
        const companyName =
          $companyA.attr("title") ||
          $companyA.text().trim() ||
          "Unknown Company";
        const companyLogo = $el.find(".sc-cHHTbD.exPzkH img").attr("src") || "";
        const companySlug = this.toSlug(companyName);

        // Salary
        const salaryText = $el.find(".sc-dauhQT.cfzaBi").text().trim();

        // Location
        const location = $el.find(".sc-jNUliw.kVIiDJ").text().trim();

        // Tags/Skills
        const tags = $el
          .find(".sc-kQwWFH.gxyerW li label")
          .map((_, tag) => $(tag).text().trim())
          .get()
          .filter(Boolean);

        const slug = `${this.toSlug(title)}-${companySlug}-vietnamworks-${jobId}`;
        const { salaryMin, salaryMax, salaryDisplay } =
          this.parseSalary(salaryText);
        const jobType = this.normalizeJobType(tags);

        const jobData: Partial<JobInput> = {
          id: jobId,
          title,
          slug,
          source: "vietnamworks",
          location,
          salaryDisplay,
          salaryMin,
          salaryMax,
          jobType: jobType as any,
          status: "OPEN",
          sourceUrl,
          titleSum: title,
          locationSum: location,
          skills: tags, // VietnamWorks show skills directly on card
          skillsSum: tags.join(", "),
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
      } catch (err) {
        // skip error items
      }
    });

    return { jobs: items, blockedByCloudflare };
  }

  // Clean HTML để lấy plain text
  private static cleanHtml(html: string): string {
    if (!html) return "";

    return html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<\/li>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Map công ty vào CompanyInput
  private static mapToCompanyInput(
    companyId: number,
    companyName: string,
    companyLogo: string,
    jobs: JobInput[],
  ): CompanyInput {
    // Lấy locations từ tất cả jobs
    const allLocations = jobs
      .map((job) => job.location)
      .filter((loc): loc is string => !!loc && loc.trim() !== "");
    const uniqueLocations = [...new Set(allLocations)];

    return {
      id: uuidv4(),
      name: companyName,
      slug: this.toSlug(companyName),
      logo: companyLogo,
      locations: uniqueLocations,
      companySize: undefined,
      industries: [],
      nameEmbedding: undefined,
      descriptionEmbedding: undefined,
      jobs,
    };
  }

  // Hàm crawl dữ liệu từ VietnamWorks bằng Web Scraping (Puppeteer)
  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    const {
      url = VietnamWorksCrawler.DEFAULT_LIST_URL,
      maxPages = 1,
      fetchDetail = false,
      existingCompanies = new Set<string>(),
      existingJobs = new Set<string>(),
    } = options || {};

    VietnamWorksCrawler.logger.log(
      `Starting VietnamWorks crawler (Web Scraping) from: ${url}`,
    );

    const companiesMap = new Map<
      string,
      { name: string; logo: string; slug: string; jobs: JobInput[] }
    >();

    let browser: Browser | null = null;
    let page: Page | null = null;

    let processedJobsCount = 0;
    let skippedJobsCount = 0;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--headless=new",
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
      });

      page = await browser.newPage();
      await VietnamWorksCrawler.configurePage(page);

      // Prime session
      await page.goto(VietnamWorksCrawler.BASE_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await VietnamWorksCrawler.jitterSleep(1000, 2000);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let pageUrl = url;
        try {
          const urlObj = new URL(url);
          // VietnamWorks uses ?l=24 or similar, pagination might be &p=2 or similar
          // Usually it's ?page=2 or similar. Let's assume ?page=
          urlObj.searchParams.set("page", pageNum.toString());
          pageUrl = urlObj.toString();
        } catch (e) {
          pageUrl = url.includes("?")
            ? `${url}&page=${pageNum}`
            : `${url}?page=${pageNum}`;
        }

        VietnamWorksCrawler.logger.log(
          `Crawling page ${pageNum}/${maxPages}: ${pageUrl}`,
        );

        try {
          let rawResults: Awaited<
            ReturnType<typeof VietnamWorksCrawler.crawlListPage>
          > | null = null;

          for (let attempt = 1; attempt <= 3; attempt++) {
            rawResults = await VietnamWorksCrawler.crawlListPage(page, pageUrl);

            if (rawResults.jobs.length > 0) break;

            if (rawResults.blockedByCloudflare) {
              VietnamWorksCrawler.logger.warn(
                `Cloudflare detected on attempt ${attempt}. Backing off...`,
              );
              await VietnamWorksCrawler.jitterSleep(
                5000 * attempt,
                10000 * attempt,
              );

              // Re-prime page
              await page.close();
              page = await browser.newPage();
              await VietnamWorksCrawler.configurePage(page);
              await page.goto(VietnamWorksCrawler.BASE_URL, {
                waitUntil: "domcontentloaded",
              });
              continue;
            }

            await VietnamWorksCrawler.jitterSleep(2000, 4000);
          }

          const pageJobs = rawResults?.jobs || [];
          if (pageJobs.length === 0) {
            VietnamWorksCrawler.logger.log(
              `No jobs found on page ${pageNum}, stopping list crawl.`,
            );
            break;
          }

          for (const { jobData, companyKey, companyData } of pageJobs) {
            const jobId = jobData.id || "unknown";

            // Skip existing jobs
            if (existingJobs.has(jobId)) {
              skippedJobsCount++;
              continue;
            }

            let fullJob: JobInput = {
              ...jobData,
            } as JobInput;

            // Tùy chọn: crawl detail page để lấy description đầy đủ
            if (fetchDetail && jobData.sourceUrl) {
              // VietnamWorksCrawler.logger.log(
              //   `  Fetching detail: ${jobData.sourceUrl}`,
              // );
              const detail = await VietnamWorksCrawler.fetchJobDetail(
                page,
                jobData.sourceUrl,
              );

              // Extract skills from detail if needed
              const detailedSkills = VietnamWorksCrawler.extractSkills(
                detail.description,
                detail.requirements.join(" "),
              );

              fullJob = {
                ...fullJob,
                description: detail.description || fullJob.description,
                requirements:
                  detail.requirements.length > 0
                    ? detail.requirements
                    : fullJob.requirements,
                skills: Array.from(
                  new Set([
                    ...(fullJob.skills || []),
                    ...detailedSkills,
                    ...(detail.skills || []),
                  ]),
                ),
                expiresAt: detail.expiresAt,
                jobLevelName: detail.jobLevel,
                yearsOfExperience: detail.yearsOfExperience,
                benefits: detail.benefits,
                descriptionRaw: detail.description,
                descriptionSum: (detail.description || "").substring(0, 500),
                requirementsSum: detail.requirements.slice(0, 5).join("; "),
              };

              await VietnamWorksCrawler.jitterSleep(800, 1500);
            }

            if (!companiesMap.has(companyKey)) {
              companiesMap.set(companyKey, {
                ...companyData,
                jobs: [],
              });
            }
            companiesMap.get(companyKey)!.jobs.push(fullJob);
            existingJobs.add(jobId);
            processedJobsCount++;
          }

          await VietnamWorksCrawler.jitterSleep(2000, 5000);
        } catch (err) {
          VietnamWorksCrawler.logger.error(`Error on page ${pageNum}: ${err}`);
          break;
        }
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    // Chuyển Map thành CompanyInput[]
    const results: CompanyInput[] = [];
    for (const [, company] of companiesMap) {
      // Skip existing companies
      if (existingCompanies.has(company.slug)) {
        continue;
      }

      results.push({
        id: uuidv4(),
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        industries: [],
        locations: [
          ...new Set(company.jobs.map((j) => j.location).filter(Boolean)),
        ],
        jobs: company.jobs,
      } as CompanyInput);

      existingCompanies.add(company.slug);
    }

    VietnamWorksCrawler.logger.log("\n=== VIETNAMWORKS CRAWL COMPLETED ===");
    VietnamWorksCrawler.logger.log(
      `Total jobs processed: ${processedJobsCount}`,
    );
    VietnamWorksCrawler.logger.log(`Total jobs skipped: ${skippedJobsCount}`);
    VietnamWorksCrawler.logger.log(`Total companies: ${results.length}`);

    return results;
  }

  // Lấy danh sách công ty có sẵn (giữ lại từ bản cũ)
  static getAvailableCategories(): string[] {
    return ["all-jobs"];
  }
}
