import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import {
  CompanyInput,
  JobInput,
  ICrawler,
  CrawlerOptions,
  SelectorConfig,
  CrawlerCssConfig,
} from "../interfaces";
import { Logger } from "../utils/logger";

export class GenericCrawler implements ICrawler {
  protected static readonly logger = Logger;
  protected sourceName: string = "generic";

  // --- Utility functions ---
  protected static toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  protected static async sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  protected static async jitterSleep(minMs: number, maxMs: number) {
    const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
    await this.sleep(ms);
  }

  protected static buildRequestHeaders() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
    };
  }

  protected static async configurePage(page: Page) {
    const headers = this.buildRequestHeaders();
    if (headers["User-Agent"]) {
      await page.setUserAgent(headers["User-Agent"]);
    }

    const { "User-Agent": _ua, ...extraHeaders } = headers;
    await page.setExtraHTTPHeaders(extraHeaders as Record<string, string>);

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    await page.setViewport({ width: 1366, height: 768 });

    // Cản resource tĩnh để load nhanh
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

    // Vượt bot cơ bản
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      // @ts-expect-error - override
      window.chrome = window.chrome || { runtime: {} };
      Object.defineProperty(navigator, "languages", {
        get: () => ["vi-VN", "vi", "en-US", "en"],
      });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    });
  }

  // --- Extractor Helper ---
  protected static extractValue(
    $: any,
    context: any,
    config?: SelectorConfig,
  ): string | string[] | undefined {
    if (!config) return undefined;

    const isSelf = config.selector === "self";
    const el = isSelf ? context : context.find(config.selector);

    if (!el || el.length === 0) return undefined;

    if (config.isMultiple) {
      const results: string[] = [];
      el.each((_: any, elem: any) => {
        let val = "";
        if (config.extract === "text") val = $(elem).text();
        else if (config.extract === "html") val = $(elem).html() || "";
        else if (config.extract === "attr" && config.attrName) {
          const attr = config.attrName.toLowerCase();
          if (attr === "src" || attr === "href") {
            // Check for lazy loading attributes if standard src/href is empty or a placeholder
            val =
              $(elem).attr("data-src") ||
              $(elem).attr("data-lazy-src") ||
              $(elem).attr("data-original") ||
              $(elem).attr(config.attrName) ||
              "";
          } else {
            val = $(elem).attr(config.attrName) || "";
          }
        }

        if (val && val.trim()) {
          results.push(val.trim());
        }
      });
      return [...new Set(results)];
    } else {
      let val = "";
      if (config.extract === "text") val = el.first().text();
      else if (config.extract === "html") val = el.first().html() || "";
      else if (config.extract === "attr" && config.attrName) {
        const attr = config.attrName.toLowerCase();
        const element = el.first();
        if (attr === "src" || attr === "href") {
          val =
            element.attr("data-src") ||
            element.attr("data-lazy-src") ||
            element.attr("data-original") ||
            element.attr(config.attrName) ||
            "";
        } else {
          val = element.attr(config.attrName) || "";
        }
      }
      return val.trim();
    }
  }

  // Helper to normalize URLs
  protected static normalizeUrl(url: string, baseUrl: string): string {
    if (!url) return "";
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  // Helper to parse experience string to number
  protected static parseExperience(text: string): number {
    if (!text) return 0;
    const lower = text.toLowerCase();
    if (lower.includes("không yêu cầu") || lower.includes("dưới 1 năm")) return 0;
    
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Helper to parse relative time to Date
  protected static parseRelativeTime(text: string): string | undefined {
    if (!text) return undefined;
    const now = new Date();
    const lower = text.toLowerCase();
    
    const match = lower.match(/(\d+)\s*(giây|phút|giờ|ngày|tuần|tháng|năm)/);
    if (!match) return undefined;

    const val = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "giây": now.setSeconds(now.getSeconds() - val); break;
      case "phút": now.setMinutes(now.getMinutes() - val); break;
      case "giờ": now.setHours(now.getHours() - val); break;
      case "ngày": now.setDate(now.getDate() - val); break;
      case "tuần": now.setDate(now.getDate() - val * 7); break;
      case "tháng": now.setMonth(now.getMonth() - val); break;
      case "năm": now.setFullYear(now.getFullYear() - val); break;
    }
    return now.toISOString();
  }

  // --- Process List Page ---
  protected static async crawlListPage(
    page: Page,
    pageUrl: string,
    options: CrawlerOptions,
  ): Promise<{
    jobs: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }>;
  }> {
    const config = options.cssConfig!;
    const listConfig = config.list;

    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Lazy load nếu có
    if (config.behavior?.lazyLoadList) {
      try {
        await page.waitForSelector(listConfig.container, { timeout: 15000 });
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollBy(0, 1000));
          await this.sleep(1000);
        }
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await this.sleep(2000);
      } catch {
        // ignore timeout
      }
    } else {
      try {
        await page.waitForSelector(listConfig.container, { timeout: 15000 });
      } catch {}
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const jobCards = $(listConfig.container);
    this.logger.log(`Found ${jobCards.length} job cards on page.`);

    const items: Array<{
      jobData: Partial<JobInput>;
      companyKey: string;
      companyData: { name: string; logo: string; slug: string };
    }> = [];

    jobCards.each((_: any, el: any) => {
      try {
        const $el = $(el);
        const title = this.extractValue($, $el, listConfig.title) as string;
        if (!title) return;

        let sourceUrl = this.extractValue($, $el, listConfig.jobUrl) as string;
        if (sourceUrl && !sourceUrl.startsWith("http")) {
          // Gắn baseUrl nếu url là relative
          const urlObj = new URL(pageUrl);
          sourceUrl = `${urlObj.origin}${sourceUrl.startsWith("/") ? "" : "/"}${sourceUrl}`;
        }

        const companyName =
          (this.extractValue($, $el, listConfig.companyName) as string) ||
          "Unknown Company";

        let companyLogo =
          (this.extractValue($, $el, listConfig.logo) as string) || "";
        companyLogo = this.normalizeUrl(companyLogo, pageUrl);

        let jobImage = "";
        if (listConfig.extraExtracts?.jobImage) {
          jobImage =
            (this.extractValue(
              $,
              $el,
              listConfig.extraExtracts.jobImage,
            ) as string) || "";
          jobImage = this.normalizeUrl(jobImage, pageUrl);
        }

        const salaryText =
          (this.extractValue($, $el, listConfig.salary) as string) || "";
        const locationText =
          (this.extractValue($, $el, listConfig.location) as string) || "";

        const expText = (this.extractValue($, $el, listConfig.yearsOfExperience) as string) || "";
        const postedText = (this.extractValue($, $el, listConfig.postedAt) as string) || "";
        const companyUrl = (this.extractValue($, $el, listConfig.companyUrl) as string) || "";
        const extraTagsText = (this.extractValue($, $el, listConfig.extraTags) as string) || "";

        let tags: string[] = [];
        if (listConfig.tags) {
          const extractedTags = this.extractValue($, $el, listConfig.tags);
          if (Array.isArray(extractedTags)) {
            tags = extractedTags;
          } else if (typeof extractedTags === "string" && extractedTags) {
            tags = extractedTags.split(",").map((s) => s.trim());
          }
        }

        if (extraTagsText) {
          const extra = extraTagsText.split(",").map(s => s.trim()).filter(Boolean);
          tags = [...new Set([...tags, ...extra])];
        }

        const companySlug = this.toSlug(companyName);
        const jobId = uuidv4(); 
        const jobSlug = `${this.toSlug(title)}-${companySlug}-${jobId}`;

        const jobData: Partial<JobInput> = {
          id: jobId,
          title,
          slug: jobSlug,
          source: options.sourceName || "generic",
          sourceUrl,
          imageUrl: jobImage,
          salaryDisplay: salaryText,
          location: locationText,
          locationSum: locationText,
          status: "OPEN",
          skills: tags,
          skillsSum: tags.join(", "),
          yearsOfExperience: this.parseExperience(expText),
          postedDate: this.parseRelativeTime(postedText),
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
        // Skip
      }
    });

    return { jobs: items };
  }

  // --- Fetch detail ---
  protected static async fetchJobDetail(
    page: Page,
    url: string,
    options: CrawlerOptions,
  ): Promise<{
    description: string;
    requirements: string[];
    benefits: string[];
    skills: string[];
    companyUpdate?: {
      logo?: string;
      address?: string;
      size?: string;
    };
  }> {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await this.jitterSleep(1000, 2000);

      const content = await page.content();
      const $ = cheerio.load(content);
      const $body = $("body");

      return this.extractDetailFromCheerio($, $body, options.cssConfig!, url);
    } catch (err) {
      this.logger.error(`Error fetching job detail from ${url}: ${err}`);
      return { description: "", requirements: [], benefits: [], skills: [] };
    }
  }

  protected static async fetchJobDetailInteractive(
    page: Page,
    index: number,
    options: CrawlerOptions,
  ): Promise<{
    description: string;
    requirements: string[];
    benefits: string[];
    skills: string[];
    companyUpdate?: {
      logo?: string;
      address?: string;
      size?: string;
    };
  }> {
    const config = options.cssConfig!;
    const interactive = config.behavior!.interactiveDetail!;
    const detailConfig = config.detail!;

    try {
      const items = await page.$$(interactive.itemSelector);
      if (items[index]) {
        // 0. Lấy tiêu đề từ card để làm mốc kiểm tra
        const titleSelector =
          (config.list.title as any).selector || config.list.title;
        const jobTitle = await items[index]
          .$eval(titleSelector, (el) => el.textContent?.trim())
          .catch(() => "");

        // 1. Cuộn tới item và click
        await items[index].evaluate((el) => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        await this.sleep(300);
        await items[index].click();

        // 2. Chờ nội dung load bằng cách kiểm tra tiêu đề trong khung chi tiết
        if (jobTitle) {
          try {
            await page.waitForFunction(
              (containerSel, title) => {
                const container = document.querySelector(containerSel);
                return container && container.textContent?.includes(title);
              },
              { timeout: 5000 },
              interactive.detailContainer,
              jobTitle,
            );
          } catch (e) {
            this.logger.warn(
              `Timeout waiting for job title "${jobTitle}" in detail pane`,
            );
          }
        }

        await this.sleep(interactive.waitAfterClickMs || 500);

        const content = await page.content();
        const $ = cheerio.load(content);

        // 3. Sử dụng container làm context để trích xuất chính xác hơn
        const $container = $(interactive.detailContainer);
        if ($container.length === 0) {
          return this.extractDetailFromCheerio(
            $,
            $("body"),
            config,
            page.url(),
          );
        }

        return this.extractDetailFromCheerio($, $container, config, page.url());
      }
    } catch (err) {
      this.logger.error(`Error in interactive detail extraction: ${err}`);
    }
    return { description: "", requirements: [], benefits: [], skills: [] };
  }

  private static extractDetailFromCheerio(
    $: any,
    $body: any,
    config: CrawlerCssConfig,
    baseUrl: string,
  ) {
    const detailConfig = config.detail!;
    const description =
      (this.extractValue($, $body, detailConfig.description) as string) || "";

    const extractedRequirements = this.extractValue(
      $,
      $body,
      detailConfig.requirements,
    );
    let requirements: string[] = [];
    if (Array.isArray(extractedRequirements)) {
      requirements = extractedRequirements.map((r) => r.trim()).filter(Boolean);
    } else if (
      typeof extractedRequirements === "string" &&
      extractedRequirements
    ) {
      requirements = extractedRequirements
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }

    const extractedBenefits = this.extractValue(
      $,
      $body,
      detailConfig.benefits,
    );
    let benefits: string[] = [];
    if (Array.isArray(extractedBenefits)) {
      benefits = extractedBenefits.map((b) => b.trim()).filter(Boolean);
    } else if (typeof extractedBenefits === "string" && extractedBenefits) {
      benefits = extractedBenefits
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }

    const extractedSkills = this.extractValue($, $body, detailConfig.skills);
    const skills = Array.isArray(extractedSkills)
      ? extractedSkills
      : typeof extractedSkills === "string"
        ? [extractedSkills]
        : [];

    const expText = (this.extractValue($, $body, (detailConfig as any).yearsOfExperience) as string) || "";
    const postedText = (this.extractValue($, $body, (detailConfig as any).postedAt) as string) || "";
    const workArrangement = (this.extractValue($, $body, (detailConfig as any).workArrangement) as string) || "";
    const jobLevelName = (this.extractValue($, $body, (detailConfig as any).jobLevelName) as string) || "";
    const companyIndustry = (this.extractValue($, $body, (detailConfig as any).companyIndustry) as string) || "";
    const companyDetailUrl = (this.extractValue($, $body, (detailConfig as any).companyUrl) as string) || "";

    const companyUpdate: any = {};
    if ((detailConfig as any).companyLogo) {
      const logo = this.extractValue(
        $,
        $body,
        (detailConfig as any).companyLogo,
      ) as string;
      if (logo) companyUpdate.logo = this.normalizeUrl(logo, baseUrl);
    }
    if ((detailConfig as any).companyAddress) {
      const addr = this.extractValue(
        $,
        $body,
        (detailConfig as any).companyAddress,
      ) as string;
      if (addr)
        companyUpdate.address = addr
          .replace(/Địa chỉ:?/i, "")
          .trim()
          .substring(0, 255);
    }
    if ((detailConfig as any).companySize) {
      const size = this.extractValue(
        $,
        $body,
        (detailConfig as any).companySize,
      ) as string;
      if (size)
        companyUpdate.size = size
          .replace(/Quy mô:?/i, "")
          .trim()
          .substring(0, 50);
    }

    return {
      description,
      requirements,
      benefits,
      skills,
      yearsOfExperience: expText ? this.parseExperience(expText) : undefined,
      postedAt: postedText ? this.parseRelativeTime(postedText) : undefined,
      workArrangement,
      jobLevelName,
      companyUpdate: {
        ...companyUpdate,
        industry: companyIndustry,
        url: companyDetailUrl ? this.normalizeUrl(companyDetailUrl, baseUrl) : undefined,
      },
    };
  }

  // --- Main Crawler Method ---
  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    if (!options?.url || !options?.cssConfig) {
      throw new Error("GenericCrawler requires 'url' and 'cssConfig'");
    }

    const {
      url,
      maxPages = 1,
      fetchDetail = false,
      existingCompanies = new Set<string>(),
      existingJobs = new Set<string>(),
    } = options;

    // Handle double nesting if it exists (some payloads might wrap cssConfig inside another cssConfig)
    let cssConfig = options.cssConfig!;
    if ((cssConfig as any).cssConfig) {
      cssConfig = (cssConfig as any).cssConfig;
    }

    const [delayMin, delayMax] = cssConfig.behavior?.delayMs || [2000, 4000];

    GenericCrawler.logger.log(`Starting Generic crawler from: ${url}`);

    const companiesMap = new Map<
      string,
      {
        name: string;
        logo: string;
        address?: string;
        companySize?: string;
        slug: string;
        jobs: JobInput[];
      }
    >();

    let browser: Browser | null = null;
    let page: Page | null = null;
    let processedJobsCount = 0;

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
      await GenericCrawler.configurePage(page);

      // Prime session
      const origin = new URL(url).origin;
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await GenericCrawler.jitterSleep(1000, 2000);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let pageUrl = url;
        try {
          const urlObj = new URL(url);
          urlObj.searchParams.set("page", pageNum.toString());
          pageUrl = urlObj.toString();
        } catch {
          pageUrl = url.includes("?")
            ? `${url}&page=${pageNum}`
            : `${url}?page=${pageNum}`;
        }

        GenericCrawler.logger.log(
          `Crawling page ${pageNum}/${maxPages}: ${pageUrl}`,
        );

        try {
          const rawResults = await GenericCrawler.crawlListPage(page, pageUrl, {
            ...options,
            sourceName: this.sourceName,
          });
          const pageJobs = rawResults.jobs || [];

          if (pageJobs.length === 0) {
            GenericCrawler.logger.log(
              `No jobs found on page ${pageNum}, stopping list crawl.`,
            );
            break;
          }

          GenericCrawler.logger.log(
            `Found ${pageJobs.length} jobs on page ${pageNum}.`,
          );

          for (let i = 0; i < pageJobs.length; i++) {
            const { jobData, companyKey, companyData } = pageJobs[i];
            let fullJob = { ...jobData } as JobInput;

            if (fetchDetail && cssConfig.detail) {
              let detail: any;
              if (cssConfig.behavior?.interactiveDetail) {
                // Interactive mode: click and extract on same page
                detail = await GenericCrawler.fetchJobDetailInteractive(
                  page,
                  i,
                  options,
                );
              } else if (jobData.sourceUrl) {
                // Standard mode: navigate to URL
                detail = await GenericCrawler.fetchJobDetail(
                  page,
                  jobData.sourceUrl,
                  options,
                );
                // Sau khi vào trang detail, phải quay lại trang list cho job tiếp theo
                await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
              }

              if (detail) {
                const mergedSkills = [
                  ...new Set([
                    ...(fullJob.skills || []),
                    ...(detail.skills || []),
                  ]),
                ];
                fullJob = {
                  ...fullJob,
                  description: detail.description,
                  requirements: detail.requirements,
                  benefits: detail.benefits,
                  descriptionSum: detail.description.substring(0, 500),
                  requirementsSum: detail.requirements.slice(0, 5).join("; "),
                  skills: mergedSkills,
                  skillsSum: mergedSkills.join(", "),
                  yearsOfExperience: detail.yearsOfExperience || fullJob.yearsOfExperience,
                  postedDate: detail.postedAt || fullJob.postedDate,
                  workArrangement: detail.workArrangement || fullJob.workArrangement,
                  jobLevelName: detail.jobLevelName || fullJob.jobLevelName,
                };

                // Cập nhật thông tin công ty từ detail nếu có
                if (detail.companyUpdate) {
                  if (!companiesMap.has(companyKey)) {
                    companiesMap.set(companyKey, {
                      ...companyData,
                      address: (companyData as any).address,
                      companySize: (companyData as any).companySize,
                      jobs: [],
                    });
                  }
                  const company = companiesMap.get(companyKey)!;
                  if (detail.companyUpdate.logo)
                    company.logo = detail.companyUpdate.logo;
                  if (detail.companyUpdate.address)
                    company.address = detail.companyUpdate.address;
                  if (detail.companyUpdate.size)
                    company.companySize = detail.companyUpdate.size;
                }
              }
              await GenericCrawler.jitterSleep(delayMin / 2, delayMax / 2);
            }

            if (!companiesMap.has(companyKey)) {
              companiesMap.set(companyKey, { ...companyData, jobs: [] });
            }
            companiesMap.get(companyKey)!.jobs.push(fullJob);
            processedJobsCount++;
          }

          await GenericCrawler.jitterSleep(delayMin, delayMax);
        } catch (err) {
          GenericCrawler.logger.error(`Error on page ${pageNum}: ${err}`);
          break;
        }
      }
    } finally {
      if (browser) await browser.close();
    }

    const results: CompanyInput[] = [];
    for (const [, company] of companiesMap) {
      results.push({
        id: uuidv4(),
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        address: company.address,
        companySize: company.companySize,
        industries: [],
        locations: [
          ...new Set(company.jobs.map((j) => j.location).filter(Boolean)),
        ],
        jobs: company.jobs,
      } as CompanyInput);
    }

    GenericCrawler.logger.log(`\n=== GENERIC CRAWL COMPLETED ===`);
    GenericCrawler.logger.log(`Total jobs processed: ${processedJobsCount}`);
    GenericCrawler.logger.log(`Total companies: ${results.length}\n`);

    return results;
  }
}
