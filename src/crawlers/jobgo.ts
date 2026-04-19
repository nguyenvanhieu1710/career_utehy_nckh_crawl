import puppeteer, { Browser } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import { CompanyInput, JobInput } from "../interfaces";

export class JobGoCrawler {
  private static readonly logger = console;

  // Trích xuất ID công ty từ URL (hỗ trợ cả /tuyen-dung/ và /cong-ty/)
  private static extractCompanyIdFromUrl(url: string): string {
    const match = url.match(/\/(?:tuyen-dung|cong-ty)\/([^\/?\s]+)/);
    return match ? match[1] : url;
  }

  // Trích xuất ID job từ URL
  private static extractJobIdFromUrl(url: string): string {
    const match = url.match(/\/viec-lam\/([^\/]+)/);
    return match ? match[1] : url;
  }

  // Danh sách các ngành nghề có thể crawl
  static getAvailableIndustries(): string[] {
    return [
      "giao-duc",
      "cong-nghe-thong-tin",
      "tai-chinh-ngan-hang",
      "y-te",
      "xay-dung",
      "ban-le",
      "san-xuat",
      "tu-van",
      "truyen-thong",
      "bao-hiem",
      "du-lich",
      "van-tai",
      "nong-nghiep",
      "bat-dong-san",
      "phap-ly",
      "logistics",
      "nang-luong",
      "duoc-pham",
    ];
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

  // Map ngành nghề sang enum
  private static mapVietnameseToIndustryEnum(
    vietnameseIndustries: string[],
  ): string[] {
    const industryMapping: Record<string, string> = {
      "Giáo dục": "EDUCATION",
      "Đào tạo": "EDUCATION",
      Education: "EDUCATION",
      "Công nghệ thông tin": "TECHNOLOGY",
      "Công nghệ": "TECHNOLOGY",
      Technology: "TECHNOLOGY",
      IT: "TECHNOLOGY",
      Software: "TECHNOLOGY",
      "Phần mềm": "TECHNOLOGY",
      "Tài chính": "FINANCE",
      Finance: "FINANCE",
      "Ngân hàng": "FINANCE",
      Banking: "FINANCE",
      "Y tế": "HEALTHCARE",
      Healthcare: "HEALTHCARE",
      "Sức khỏe": "HEALTHCARE",
      "Chăm sóc sức khỏe": "HEALTHCARE",
      "Bán lẻ": "RETAIL",
      Retail: "RETAIL",
      "Thương mại": "RETAIL",
      "Sản xuất": "MANUFACTURING",
      Manufacturing: "MANUFACTURING",
      "Tư vấn": "CONSULTING",
      Consulting: "CONSULTING",
      Marketing: "MARKETING",
      "Truyền thông": "MEDIA",
      Media: "MEDIA",
      "Giải trí": "ENTERTAINMENT",
      Entertainment: "ENTERTAINMENT",
      "Bất động sản": "REAL_ESTATE",
      "Real Estate": "REAL_ESTATE",
      "Ô tô": "AUTOMOTIVE",
      Automotive: "AUTOMOTIVE",
      "Xây dựng": "CONSTRUCTION",
      Construction: "CONSTRUCTION",
      "Năng lượng": "ENERGY",
      Energy: "ENERGY",
      "Thực phẩm": "FOOD_BEVERAGE",
      Food: "FOOD_BEVERAGE",
      "Đồ uống": "FOOD_BEVERAGE",
      "Chính phủ": "GOVERNMENT",
      Government: "GOVERNMENT",
      "Bảo hiểm": "INSURANCE",
      Insurance: "INSURANCE",
      "Pháp lý": "LEGAL",
      Legal: "LEGAL",
      Luật: "LEGAL",
      Logistics: "LOGISTICS",
      "Vận tải": "TRANSPORTATION",
      Transportation: "TRANSPORTATION",
      "Du lịch": "TRAVEL_HOSPITALITY",
      Travel: "TRAVEL_HOSPITALITY",
      "Khách sạn": "TRAVEL_HOSPITALITY",
      Hospitality: "TRAVEL_HOSPITALITY",
      "Viễn thông": "TELECOMMUNICATIONS",
      Telecommunications: "TELECOMMUNICATIONS",
      "Dược phẩm": "PHARMACEUTICALS",
      Pharmaceuticals: "PHARMACEUTICALS",
    };

    const mappedIndustries: string[] = [];
    for (const industry of vietnameseIndustries) {
      const trimmed = industry.trim();
      const mapped = industryMapping[trimmed] || "OTHER";
      mappedIndustries.push(mapped);
    }
    return [...new Set(mappedIndustries)];
  }

  // Map quy mô công ty
  private static mapCompanySize(sizeInput: string | undefined | null): string {
    if (!sizeInput || sizeInput.trim() === "") return "STARTUP";
    const size = sizeInput.trim().toLowerCase();
    const sizeMapping: Record<string, string> = {
      "khởi nghiệp": "STARTUP",
      startup: "STARTUP",
      "mới thành lập": "STARTUP",
      nhỏ: "SMALL",
      small: "SMALL",
      "nhỏ vừa": "SMALL",
      vừa: "MEDIUM",
      medium: "MEDIUM",
      "trung bình": "MEDIUM",
      lớn: "LARGE",
      large: "LARGE",
      "doanh nghiệp lớn": "ENTERPRISE",
      enterprise: "ENTERPRISE",
      "tập đoàn": "ENTERPRISE",
      "1-10": "STARTUP",
      "10-50": "SMALL",
      "11-50": "SMALL",
      "50-200": "MEDIUM",
      "51-200": "MEDIUM",
      "200-1000": "LARGE",
      "201-1000": "LARGE",
      "1000+": "ENTERPRISE",
      ">1000": "ENTERPRISE",
    };
    const mapped = sizeMapping[size];
    if (mapped) return mapped;
    const numberMatch = sizeInput.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      if (num <= 10) return "STARTUP";
      if (num <= 50) return "SMALL";
      if (num <= 200) return "MEDIUM";
      if (num <= 1000) return "LARGE";
      return "ENTERPRISE";
    }
    return "STARTUP";
  }

  // Hàm crawl dữ liệu chính
  static async crawl(options?: {
    baseUrl?: string;
    industries?: string[];
    maxPages?: number;
    existingCompanies?: Set<string>;
    existingJobs?: Set<string>;
  }): Promise<CompanyInput[]> {
    let browser: Browser | null = null;
    try {
      const {
        industries,
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

      const targetIndustries = options?.baseUrl
        ? ["custom"]
        : industries || ["cong-nghe-thong-tin"];

      for (const industry of targetIndustries) {
        this.logger.log(`\n=== CRAWLING: ${industry.toUpperCase()} ===`);
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage && currentPage <= maxPages) {
          const targetUrl = options?.baseUrl
            ? currentPage === 1
              ? options.baseUrl
              : options.baseUrl.includes("?")
                ? `${options.baseUrl}&page=${currentPage}`
                : `${options.baseUrl}?page=${currentPage}`
            : currentPage === 1
              ? `https://jobsgo.vn/cong-ty-${industry}.html`
              : `https://jobsgo.vn/cong-ty-${industry}.html?page=${currentPage}`;

          this.logger.log(`🔍 Crawling Page ${currentPage}: ${targetUrl}`);

          let pageSuccess = false;
          let retryCount = 0;
          while (retryCount < 2 && !pageSuccess) {
            pageSuccess = await this.crawlListPage(
              page,
              targetUrl,
              results,
              existingCompanies,
              existingJobs,
            );
            if (!pageSuccess) {
              retryCount++;
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          if (!pageSuccess) {
            hasNextPage = false;
            break;
          }

          const nextPageExists = await page.evaluate(
            (currentPageNum: number) => {
              const nextPageLink = document.querySelector(
                `a[data-page="${currentPageNum + 1}"]`,
              );
              if (nextPageLink) return true;
              const nextPageHref = document.querySelector(
                `a[href*="page=${currentPageNum + 1}"]`,
              );
              if (nextPageHref) return true;
              const nextButton = document.querySelector(
                'a[aria-label="Next"], a.next, li.next a',
              );
              return !!nextButton;
            },
            currentPage,
          );

          if (nextPageExists && currentPage < maxPages) {
            currentPage++;
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            hasNextPage = false;
          }
        }
        if (options?.baseUrl) break;
      }

      this.logger.log("\n=== CRAWL COMPLETED ===");
      this.logger.log(`Total companies crawled: ${results.length}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to crawl JobGo: ${error}`);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  private static async crawlListPage(
    page: any,
    url: string,
    results: CompanyInput[],
    existingCompanies: Set<string>,
    existingJobs: Set<string>,
  ): Promise<boolean> {
    try {
      await page.goto(url, { waitUntil: "networkidle2" });

      // JobsGO viec-lam pages: lấy trực tiếp link job từ các card
      const jobCardLinks = await page.$$eval(
        ".col-grid .job-card a.text-decoration-none",
        (links: any) =>
          links.map((link: any) => (link as HTMLAnchorElement).href),
      );

      if (jobCardLinks.length === 0) {
        this.logger.log(`[!] No job cards found on page, stopping.`);
        return false;
      }

      this.logger.log(
        `[!] Found ${jobCardLinks.length} job cards. Extracting company links...`,
      );

      // Vào từng trang job detail để lấy link công ty (/tuyen-dung/)
      let companyLinks: string[] = [];
      for (const jobUrl of jobCardLinks) {
        try {
          await page.goto(jobUrl, { waitUntil: "domcontentloaded" });
          const companyUrl = await page.evaluate(() => {
            // JobsGO dùng /tuyen-dung/ cho trang công ty
            const a = document.querySelector(
              'a[href*="/tuyen-dung/"]',
            ) as HTMLAnchorElement | null;
            return a ? a.href : null;
          });
          if (companyUrl && !companyLinks.includes(companyUrl)) {
            companyLinks.push(companyUrl);
          }
        } catch (e) {}
      }

      if (companyLinks.length === 0) return false;

      for (const link of companyLinks) {
        try {
          const companyId = this.extractCompanyIdFromUrl(link);
          if (existingCompanies.has(companyId)) continue;

          await page.goto(link, { waitUntil: "networkidle2" });
          const companyData = await page.evaluate(() => {
            const logo =
              (
                document.querySelector(
                  "img.img-fluid.logo.rounded-3",
                ) as HTMLImageElement
              )?.src || "";
            const companyName =
              document
                .querySelector(".fw-bolder.text-dark.fs-3.mb-2.w-100")
                ?.textContent?.trim() || "";
            const description =
              document
                .querySelector("#company-description")
                ?.textContent?.replace(/\n/g, " ")
                ?.trim() || "";
            const industryText =
              document
                .querySelector("span.company-category-list")
                ?.textContent?.replace(/\n/g, " ")
                ?.trim() || "";
            const industries = industryText
              ? industryText.split(/[,;]+/).map((i) => i.trim())
              : [];

            let locations: string[] = [];
            let website = "";
            let email = "";
            let phone = "";

            const liElements = document.querySelectorAll(
              "li.d-flex.align-items-start.gap-2",
            );
            if (liElements[0])
              locations = [
                liElements[0].querySelector("span")?.textContent?.trim() || "",
              ];
            if (liElements[1])
              website =
                (
                  liElements[1].querySelector(
                    'a[rel="nofollow"]',
                  ) as HTMLAnchorElement
                )?.href || "";

            document.querySelectorAll('a[rel="nofollow"]').forEach((el) => {
              const text = el.textContent?.trim() || "";
              if (text.includes("@")) email = text;
              if (/\d{8,}/.test(text)) phone = text;
            });

            return {
              companyName,
              email,
              description,
              phone,
              website,
              industries,
              locations,
              logo,
            };
          });

          const jobLinks = await page.$$eval(
            "a.text-decoration-none.text-dark.d-block.h-100",
            (els: any) => els.map((e: any) => e.href),
          );
          const jobs: JobInput[] = [];

          for (const jobUrl of jobLinks) {
            try {
              const jobId = this.extractJobIdFromUrl(jobUrl);
              if (existingJobs.has(jobId)) continue;

              await page.goto(jobUrl, { waitUntil: "networkidle2" });
              const jobData = await page.evaluate(() => {
                const title =
                  document
                    .querySelector("h1.job-title.mb-2.mb-sm-3.fs-4")
                    ?.textContent?.trim() || "";
                const salaryDisplay =
                  document
                    .querySelector("span.text-truncate.d-inline-block strong")
                    ?.textContent?.trim() || "";
                const descEls = document.querySelectorAll(
                  "div.job-detail-card",
                );
                const description =
                  descEls[0]
                    ?.querySelector("div")
                    ?.textContent?.replace(/\n/g, " ")
                    ?.trim() || "";
                const requirements =
                  descEls[1]
                    ?.querySelector("div")
                    ?.textContent?.split("\n")
                    .map((l) => l.trim())
                    .filter((l) => l) || [];

                let postedDate = "";
                document
                  .querySelectorAll(
                    "div.col-6.col-md-4.d-flex.align-items-start",
                  )
                  .forEach((div) => {
                    if (div.textContent?.includes("Ngày đăng tuyển"))
                      postedDate =
                        div.querySelector("strong")?.textContent?.trim() || "";
                  });
                const deadlineLi = document.querySelector(
                  "li.col-md-auto.col-date.d-flex.align-items-center",
                );
                const expiresAt =
                  deadlineLi?.querySelector("strong")?.textContent?.trim() ||
                  "";
                const location =
                  document
                    .querySelector("div.location-extra.mt-2")
                    ?.textContent?.trim() || "";

                return {
                  title,
                  salaryDisplay,
                  description,
                  requirements,
                  postedDate,
                  expiresAt,
                  location,
                  sourceUrl: window.location.href,
                };
              });

              // Xử lý lương & kỹ năng cụ thể của bạn
              const salaryNumbers = jobData.salaryDisplay.match(/\d+/g);
              let salaryMin, salaryMax;
              if (salaryNumbers && salaryNumbers.length >= 2) {
                salaryMin = parseInt(salaryNumbers[0]);
                salaryMax = parseInt(salaryNumbers[1]);
              }

              const keywords = [
                "excel",
                "word",
                "it",
                "javascript",
                "python",
                "java",
                "nodejs",
                "react",
                "vue",
                "angular",
                "ai",
                "seo",
                "marketing",
                "sales",
                "bán hàng",
                "tư vấn",
                "giao tiếp",
                "english",
                "sql",
                "git",
                "docker",
                "cloud",
                // ... (có thể thêm lại danh sách đầy đủ nếu cần)
              ];
              const skills = keywords.filter((k) =>
                (jobData.description + (jobData.requirements || []).join(" "))
                  .toLowerCase()
                  .includes(k),
              );

              jobs.push({
                ...jobData,
                id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                slug: this.toSlug(jobData.title),
                salaryMin,
                salaryMax,
                skills,
                source: "jobsgo",
                status: "OPEN",
              } as any);
              await new Promise((r) => setTimeout(r, 800));
            } catch (e) {}
          }

          results.push({
            id: uuidv4(),
            name: companyData.companyName,
            slug: this.toSlug(companyData.companyName),
            website: companyData.website,
            description: companyData.description,
            logo: companyData.logo,
            companySize: "MEDIUM",
            industries: this.mapVietnameseToIndustryEnum(
              companyData.industries,
            ),
            locations: companyData.locations,
            contactEmail: companyData.email,
            phone: companyData.phone,
            jobs,
          } as any);
          existingCompanies.add(companyId);
        } catch (e) {}
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}
