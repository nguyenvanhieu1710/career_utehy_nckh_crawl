import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
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
    if (t.includes("cloudflare") && t.includes("attention required")) return true;

    const h = (html || "").toLowerCase();
    return (
      h.includes("attention required") &&
      h.includes("cloudflare") &&
      (h.includes("cf-error") || h.includes("cf-chl") || h.includes("cf-ray"))
    );
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

  private static normalizeJobType(tags: string[]): string | undefined {
    for (const t of tags) {
      const lower = t.toLowerCase();
      if (lower.includes("full-time") || lower.includes("full time")) {
        return "FULL_TIME";
      }
      if (lower.includes("part-time") || lower.includes("part time")) {
        return "PART_TIME";
      }
      if (lower.includes("toàn thời gian")) {
        return "FULL_TIME";
      }
      if (lower.includes("bán thời gian")) {
        return "PART_TIME";
      }
    }
    return undefined;
  }

  // --- Fetch job detail page để lấy description ---
  private static async fetchJobDetail(
    page: Page,
    jobUrl: string,
  ): Promise<{
    description: string;
    requirements: string[];
    benefits: string;
    expiresAt?: string;
  }> {
    try {
      await page.goto(jobUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      try {
        await page.waitForSelector(
          ".job-description__item--content, .job__description",
          { timeout: 10000 },
        );
      } catch {
        // ignore
      }

      const html = await page.content();
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
  private static async crawlListPage(page: Page, pageUrl: string): Promise<{
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

    try {
      await page.waitForFunction(
        () =>
          document.querySelectorAll(
            ".job-item-search-result[data-job-id]",
          ).length > 0,
        { timeout: 20000 },
      );
    } catch {
      // ignore
    }

    // Fallback: một số trang/pagination có thể load job bằng XHR + lazy render
    for (let i = 0; i < 3; i++) {
      const count = await page.evaluate(
        () =>
          document.querySelectorAll(
            ".job-item-search-result[data-job-id]",
          ).length,
      );
      if (count > 0) break;

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((r) => setTimeout(r, 1500));

      try {
        await page.waitForFunction(
          () =>
            document.querySelectorAll(
              ".job-item-search-result[data-job-id]",
            ).length > 0,
          { timeout: 5000 },
        );
      } catch {
        // ignore
      }
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const jobCardCount = $(".job-item-search-result[data-job-id]").length;
    console.log("Total job cards found:", jobCardCount);

    let blockedByCloudflare = false;

    if (jobCardCount === 0) {
      const currentUrl = page.url();
      let pageTitle = "";
      try {
        pageTitle = await page.title();
      } catch {
        // ignore
      }
      const snippet = html.substring(0, 400).replace(/\s+/g, " ").trim();
      this.logger.warn(
        `TopCV page returned 0 job cards. url=${currentUrl} title=${pageTitle} snippet=${snippet}`,
      );

      blockedByCloudflare = this.isCloudflareChallenge(html, pageTitle);
      if (blockedByCloudflare) {
        this.logger.warn("TopCV appears blocked by Cloudflare on this page.");
      }
    }

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

        const slug = `${this.toSlug(title)}-${companySlug}-topcv-${jobId}`;

        const { salaryMin, salaryMax, salaryDisplay } =
          this.parseSalary(salaryText);
        const jobType = this.normalizeJobType(tags);

        const jobData: Partial<JobInput> = {
          id: jobId,
          title,
          slug,
          source: "topcv",
          location,
          salaryDisplay,
          salaryMin,
          salaryMax,
          jobType,
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

    return { jobs: items, blockedByCloudflare };
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

    let browser: Browser | null = null;
    let page: Page | null = null;

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
      await this.configurePage(page);

      await page.goto(this.BASE_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await this.jitterSleep(800, 1500);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let pageUrl = url;
        try {
          const urlObj = new URL(url);
          urlObj.searchParams.set("page", pageNum.toString());
          pageUrl = urlObj.toString();
        } catch (e) {
          // Fallback nếu url không hợp lệ hoặc format lạ
          pageUrl = url.includes("?")
            ? `${url}&page=${pageNum}`
            : `${url}?page=${pageNum}`;
        }

        this.logger.log(`Crawling page ${pageNum}/${maxPages}: ${pageUrl}`);

        try {
          let rawItems: Awaited<ReturnType<typeof this.crawlListPage>> | null =
            null;

          for (let attempt = 1; attempt <= 3; attempt++) {
            rawItems = await this.crawlListPage(page, pageUrl);

            if (rawItems.jobs.length > 0) break;

            if (rawItems.blockedByCloudflare) {
              const backoffMin = 3000 * attempt;
              const backoffMax = 6000 * attempt;
              await this.jitterSleep(backoffMin, backoffMax);

              try {
                await page.close();
              } catch {
                // ignore
              }

              page = await browser.newPage();
              await this.configurePage(page);

              // Prime lại session trước khi thử lại
              await page.goto(this.BASE_URL, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
              });
              await this.jitterSleep(800, 1500);
              continue;
            }

            await this.jitterSleep(1200, 2500);
          }

          const finalJobs = rawItems?.jobs || [];

          if (finalJobs.length === 0) {
            this.logger.log(`No jobs found on page ${pageNum}, stopping.`);
            break;
          }

          this.logger.log(`Found ${finalJobs.length} jobs on page ${pageNum}`);

          for (const { jobData, companyKey, companyData } of finalJobs) {
            let fullJob: JobInput = {
              id: jobData.id || uuidv4(),
              title: jobData.title || "",
              slug: jobData.slug || this.toSlug(jobData.title || ""),
              ...jobData,
            } as JobInput;

            // Tùy chọn: crawl detail page để lấy description đầy đủ
            if (fetchDetail && jobData.sourceUrl) {
              this.logger.log(`  Fetching detail: ${jobData.sourceUrl}`);
              const detail = await this.fetchJobDetail(page, jobData.sourceUrl);
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

          await this.jitterSleep(2000, 4500);
        } catch (err) {
          this.logger.error(`Error on page ${pageNum}: ${err}`);
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
