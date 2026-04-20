import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import {
  CompanyInput,
  JobInput,
  ICrawler,
  CrawlerOptions,
} from "../interfaces";

export class JobGoCrawler implements ICrawler {
  private static readonly logger = console;
  private static readonly BASE_URL = "https://jobsgo.vn";

  // Trích xuất ID công ty từ URL
  private static extractCompanyIdFromUrl(url: string): string {
    const match = url.match(/\/(?:tuyen-dung|cong-ty)\/([^\/?\s]+)/);
    return match ? match[1] : url;
  }

  // Trích xuất ID job từ URL
  private static extractJobIdFromUrl(url: string): string {
    const match = url.match(/\/viec-lam\/([^\/-]+)-/);
    if (match) return match[1];
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(".html", "").split("-").pop() || lastPart;
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

  // Hàm crawl dữ liệu chính
  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    let browser: Browser | null = null;
    try {
      const {
        url: baseUrl = "https://jobsgo.vn/cong-ty-cong-nghe-thong-tin.html",
        maxPages = 1,
        existingCompanies = new Set<string>(),
        existingJobs = new Set<string>(),
      } = options || {};

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      const results: CompanyInput[] = [];

      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && currentPage <= maxPages) {
        const targetUrl =
          currentPage === 1
            ? baseUrl
            : baseUrl.includes("?")
              ? `${baseUrl}&page=${currentPage}`
              : `${baseUrl}?page=${currentPage}`;

        JobGoCrawler.logger.log(`🔍 JobGo: Crawling Page ${currentPage}`);

        const pageSuccess = await this.crawlListPage(
          page,
          targetUrl,
          results,
          existingCompanies,
          existingJobs,
        );

        if (!pageSuccess || currentPage >= maxPages) {
          hasNextPage = false;
        } else {
          currentPage++;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      JobGoCrawler.logger.log(`✅ JobGo crawl completed: ${results.length} companies`);
      return results;
    } catch (error) {
      JobGoCrawler.logger.error(`❌ JobGo crawl failed: ${error}`);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  private async crawlListPage(
    page: Page,
    url: string,
    results: CompanyInput[],
    existingCompanies: Set<string>,
    existingJobs: Set<string>,
  ): Promise<boolean> {
    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      const html = await page.content();
      const $ = cheerio.load(html);

      const jobLinks: string[] = [];
      $(".col-grid .job-card a.text-decoration-none").each((_, el) => {
        const href = $(el).attr("href");
        if (href) jobLinks.push(href.startsWith("http") ? href : `https://jobsgo.vn${href}`);
      });

      if (jobLinks.length === 0) return false;

      const companyLinks = new Set<string>();
      for (const jobUrl of jobLinks.slice(0, 10)) {
        try {
          await page.goto(jobUrl, { waitUntil: "domcontentloaded" });
          const jobHtml = await page.content();
          const $job = cheerio.load(jobHtml);
          const cLink = $job('a[href*="/tuyen-dung/"], a[href*="/cong-ty/"]').first().attr("href");
          if (cLink) companyLinks.add(cLink.startsWith("http") ? cLink : `https://jobsgo.vn${cLink}`);
        } catch (e) {}
      }

      for (const cLink of companyLinks) {
        const companyId = JobGoCrawler.extractCompanyIdFromUrl(cLink);
        if (existingCompanies.has(companyId)) continue;

        await page.goto(cLink, { waitUntil: "networkidle2" });
        const cHtml = await page.content();
        const $c = cheerio.load(cHtml);

        const companyName = $c(".fw-bolder.text-dark.fs-3.mb-2.w-100").text().trim();
        if (!companyName) continue;

        const companyLogo = $c("img.img-fluid.logo.rounded-3").attr("src") || "";
        const companySlug = JobGoCrawler.toSlug(companyName);

        const jobs: JobInput[] = [];
        const jobItemsInCompany = $c("a.text-decoration-none.text-dark.d-block.h-100");

        for (let i = 0; i < jobItemsInCompany.length; i++) {
          const jHref = $(jobItemsInCompany[i]).attr("href") || "";
          const jUrl = jHref.startsWith("http") ? jHref : `https://jobsgo.vn${jHref}`;
          const jobId = JobGoCrawler.extractJobIdFromUrl(jUrl);

          if (existingJobs.has(jobId)) continue;

          await page.goto(jUrl, { waitUntil: "networkidle2" });
          const jHtml = await page.content();
          const $j = cheerio.load(jHtml);

          const title = $j("h1.job-title").text().trim();
          const salaryDisplay = $j("span.text-truncate.d-inline-block strong").text().trim();
          
          const jobSlug = `${JobGoCrawler.toSlug(title)}-${companySlug}-jobgo-${jobId}`;

          jobs.push({
            id: jobId,
            title,
            slug: jobSlug,
            source: "jobgo",
            salaryDisplay,
            location: $j("div.location-extra.mt-2").text().trim(),
            description: $j("div.job-detail-card").first().find("div").text().trim(),
            status: "OPEN",
            sourceUrl: jUrl,
          } as JobInput);
          
          existingJobs.add(jobId);
        }

        results.push({
          id: uuidv4(),
          name: companyName,
          slug: companySlug,
          logo: companyLogo,
          jobs,
          locations: [],
          industries: [],
        } as CompanyInput);

        existingCompanies.add(companyId);
      }

      return true;
    } catch (e) {
      return false;
    }
  }
}
