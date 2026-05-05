import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import {
  CompanyInput,
  JobInput,
  ICrawler,
  CrawlerOptions,
  SelectorConfig,
} from "../interfaces";
import { Logger } from "../utils/logger";

export class GenericCrawler implements ICrawler {
  protected static readonly logger = Logger;

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
    config?: SelectorConfig
  ): string | string[] | undefined {
    if (!config) return undefined;

    const el = context.find(config.selector);
    if (el.length === 0) return undefined;

    if (config.isMultiple) {
      const results: string[] = [];
      el.each((_: any, elem: any) => {
        let val = "";
        if (config.extract === "text") val = $(elem).text();
        else if (config.extract === "html") val = $(elem).html() || "";
        else if (config.extract === "attr" && config.attrName)
          val = $(elem).attr(config.attrName) || "";
        if (val) results.push(val.trim());
      });
      return results;
    } else {
      let val = "";
      if (config.extract === "text") val = el.first().text();
      else if (config.extract === "html") val = el.first().html() || "";
      else if (config.extract === "attr" && config.attrName)
        val = el.first().attr(config.attrName) || "";
      return val.trim();
    }
  }

  // --- Process List Page ---
  protected static async crawlListPage(
    page: Page,
    pageUrl: string,
    options: CrawlerOptions
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
          window.scrollTo(0, document.body.scrollHeight)
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

        const companyName = (this.extractValue(
          $,
          $el,
          listConfig.companyName
        ) as string) || "Unknown Company";
        const companyLogo = (this.extractValue(
          $,
          $el,
          listConfig.logo
        ) as string) || "";
        const salaryText = (this.extractValue(
          $,
          $el,
          listConfig.salary
        ) as string) || "";
        const locationText = (this.extractValue(
          $,
          $el,
          listConfig.location
        ) as string) || "";
        
        let tags: string[] = [];
        if (listConfig.tags) {
          const extractedTags = this.extractValue($, $el, listConfig.tags);
          if (Array.isArray(extractedTags)) {
             tags = extractedTags;
          } else if (typeof extractedTags === "string" && extractedTags) {
             tags = extractedTags.split(",").map(s => s.trim());
          }
        }

        const companySlug = this.toSlug(companyName);
        const jobId = uuidv4(); // Generate temp UUID, should ideal parse from URL
        const jobSlug = `${this.toSlug(title)}-${companySlug}-${jobId}`;

        const jobData: Partial<JobInput> = {
          id: jobId,
          title,
          slug: jobSlug,
          source: "generic",
          sourceUrl,
          salaryDisplay: salaryText,
          location: locationText,
          locationSum: locationText,
          status: "OPEN",
          skills: tags,
          skillsSum: tags.join(", ")
        };

        items.push({
          jobData,
          companyKey: companySlug,
          companyData: { name: companyName, logo: companyLogo, slug: companySlug },
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
    jobUrl: string,
    options: CrawlerOptions
  ): Promise<{
    description: string;
    requirements: string[];
    benefits: string;
  }> {
    const detailConfig = options.cssConfig?.detail;
    if (!detailConfig) return { description: "", requirements: [], benefits: "" };

    try {
      await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
      const html = await page.content();
      const $ = cheerio.load(html);
      const $body = $("body");

      const description = (this.extractValue($, $body, detailConfig.description) as string) || "";
      const requirementsText = (this.extractValue($, $body, detailConfig.requirements) as string) || "";
      const requirements = requirementsText ? requirementsText.split("\n").map(l => l.trim()).filter(Boolean) : [];
      const benefits = (this.extractValue($, $body, detailConfig.benefits) as string) || "";

      return { description, requirements, benefits };
    } catch {
      return { description: "", requirements: [], benefits: "" };
    }
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
      cssConfig,
    } = options;

    const [delayMin, delayMax] = cssConfig.behavior?.delayMs || [2000, 4000];

    GenericCrawler.logger.log(`Starting Generic crawler from: ${url}`);

    const companiesMap = new Map<
      string,
      { name: string; logo: string; slug: string; jobs: JobInput[] }
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
           pageUrl = url.includes("?") ? `${url}&page=${pageNum}` : `${url}?page=${pageNum}`;
        }

        GenericCrawler.logger.log(`Crawling page ${pageNum}/${maxPages}: ${pageUrl}`);

        try {
          const rawResults = await GenericCrawler.crawlListPage(page, pageUrl, options);
          const pageJobs = rawResults.jobs || [];

          if (pageJobs.length === 0) {
            GenericCrawler.logger.log(`No jobs found on page ${pageNum}, stopping list crawl.`);
            break;
          }

          GenericCrawler.logger.log(`Found ${pageJobs.length} jobs on page ${pageNum}.`);

          for (const { jobData, companyKey, companyData } of pageJobs) {
             let fullJob = { ...jobData } as JobInput;

             if (fetchDetail && jobData.sourceUrl && cssConfig.detail) {
                const detail = await GenericCrawler.fetchJobDetail(page, jobData.sourceUrl, options);
                fullJob = {
                   ...fullJob,
                   description: detail.description,
                   requirements: detail.requirements,
                   descriptionSum: detail.description.substring(0, 500),
                   requirementsSum: detail.requirements.slice(0, 5).join("; "),
                };
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
         industries: [],
         locations: [...new Set(company.jobs.map(j => j.location).filter(Boolean))],
         jobs: company.jobs,
       } as CompanyInput);
    }

    GenericCrawler.logger.log(`\n=== GENERIC CRAWL COMPLETED ===`);
    GenericCrawler.logger.log(`Total jobs processed: ${processedJobsCount}`);
    GenericCrawler.logger.log(`Total companies: ${results.length}\n`);

    return results;
  }
}
