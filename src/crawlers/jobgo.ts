import puppeteer, { Browser } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import { CompanyInput, JobInput } from "../interfaces";

export class JobGoCrawler {
  private static readonly logger = console; // Sử dụng console thay cho NestJS Logger

  // Trích xuất ID công ty từ URL
  private static extractCompanyIdFromUrl(url: string): string {
    const match = url.match(/\/cong-ty\/([^\/]+)/);
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
      "giao-duc", // Giáo dục
      "cong-nghe-thong-tin", // Công nghệ thông tin
      "tai-chinh-ngan-hang", // Tài chính ngân hàng
      "y-te", // Y tế
      "xay-dung", // Xây dựng
      "ban-le", // Bán lẻ
      "san-xuat", // Sản xuất
      "tu-van", // Tư vấn
      "truyen-thong", // Truyền thông
      "bao-hiem", // Bảo hiểm
      "du-lich", // Du lịch
      "van-tai", // Vận tải
      "nong-nghiep", // Nông nghiệp
      "bat-dong-san", // Bất động sản
      "phap-ly", // Pháp lý
      "logistics", // Logistics
      "nang-luong", // Năng lượng
      "duoc-pham", // Dược phẩm
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
    vietnameseIndustries: string[]
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
    if (!sizeInput || sizeInput.trim() === "") {
      return "STARTUP";
    }

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
    if (mapped) {
      return mapped;
    }

    const numberMatch = sizeInput.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      if (num <= 10) return "STARTUP";
      if (num <= 50) return "SMALL";
      if (num <= 200) return "MEDIUM";
      if (num <= 1000) return "LARGE";
      return "ENTERPRISE";
    }

    this.logger.warn(
      `No mapping found for company size: "${sizeInput}", using STARTUP`
    );
    return "STARTUP";
  }

  // Hàm crawl dữ liệu từ jobsgo.vn
  static async crawl(options?: {
    industries?: string[];
    maxPages?: number;
    existingCompanies?: Set<string>;
    existingJobs?: Set<string>;
  }): Promise<CompanyInput[]> {
    let browser: Browser | null = null;
    try {
      this.logger.log(
        "Starting JobGo crawler - crawling companies from jobsgo.vn"
      );

      // Cấu hình mặc định
      const {
        industries = [
          "giao-duc",
          // "cong-nghe-thong-tin",
          // "tai-chinh-ngan-hang",
          // "y-te",
          // "xay-dung",
        ],
        maxPages = 2,
        existingCompanies = new Set<string>(),
        existingJobs = new Set<string>(),
      } = options || {};

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      const results: CompanyInput[] = [];

      // Crawl từng ngành nghề
      for (const industry of industries) {
        this.logger.log(
          `\n=== CRAWLING INDUSTRY: ${industry.toUpperCase()} ===`
        );

        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage && currentPage <= maxPages) {
          this.logger.log(
            `=== CRAWLING PAGE ${currentPage} FOR ${industry} ===`
          );

          await page.goto(
            `https://jobsgo.vn/cong-ty-${industry}-trang-${currentPage}.html`,
            { waitUntil: "networkidle2" }
          );

          const companyLinks = await page.$$eval(".grid-item", (links) =>
            links.map((link) => (link as HTMLAnchorElement).href)
          );

          if (companyLinks.length === 0) {
            this.logger.log(
              `No companies found on page ${currentPage} for ${industry}, stopping crawl for this industry`
            );
            break;
          }

          this.logger.log(
            `Found ${companyLinks.length} companies on page ${currentPage} for ${industry}`
          );

          let crawledCount = 0;
          for (const link of companyLinks) {
            try {
              // Kiểm tra trùng lặp công ty
              const companyId = this.extractCompanyIdFromUrl(link);
              if (existingCompanies.has(companyId)) {
                this.logger.log(`⏭️  Skipping existing company: ${companyId}`);
                continue;
              }

              await page.goto(link, { waitUntil: "networkidle2" });

              // Lấy thông tin công ty
              const companyData = await page.evaluate(() => {
                const logo =
                  (
                    document.querySelector(
                      "img.img-fluid.logo.rounded-3"
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

                const validIndustries = [
                  "Giáo dục",
                  "Công nghệ thông tin",
                  "Tài chính",
                  "Ngân hàng",
                  "Y tế",
                  "Xây dựng",
                  "Bán lẻ",
                  "Sản xuất",
                  "Dịch vụ",
                  "Truyền thông",
                  "Bảo hiểm",
                  "Du lịch",
                  "Vận tải",
                  "Nông nghiệp",
                  "Bất động sản",
                  "Luật",
                  "Thiết kế",
                  "Marketing",
                  "Nhà hàng",
                  "Khách sạn",
                  "Logistics",
                  "Điện tử",
                  "Viễn thông",
                  "Thương mại điện tử",
                  "Kho vận",
                  "Quản lý chuỗi cung ứng",
                  "Kiến trúc",
                  "Kế toán",
                  "Kiểm toán",
                  "QA/QC",
                  "Chăm sóc khách hàng",
                  "Nhân sự",
                  "Thực phẩm",
                  "Hóa chất",
                  "Môi trường",
                  "Thể thao",
                  "Giải trí",
                  "Thời trang",
                  "Năng lượng",
                  "Dược phẩm",
                  "Thủ công mỹ nghệ",
                  "In ấn",
                  "Xuất nhập khẩu",
                  "Tư vấn",
                  "Quảng cáo",
                  "Tổ chức sự kiện",
                  "An ninh",
                  "Bảo trì",
                  "Bảo dưỡng",
                  "Bảo mật",
                  "Khoa học",
                  "Nghiên cứu",
                  "Pháp lý",
                  "Quản trị",
                  "Phân tích dữ liệu",
                  "Data Analysis",
                  "Project Management",
                  "Scrum",
                  "Kanban",
                  "QA",
                  "QC",
                  "QA/QC",
                ];

                let industries: string[] = [];
                const industryText =
                  document
                    .querySelector("span.company-category-list")
                    ?.textContent?.replace(/\n/g, " ")
                    ?.trim() || "";
                if (industryText) {
                  const rawIndustries = industryText
                    .split(/[,;]+/)
                    .map((i) => i.trim());
                  industries = rawIndustries.filter((i) =>
                    validIndustries.includes(i)
                  );
                }

                const companySize = "";
                let locations: string[] = [];
                let contactEmail = "";
                let phone = "";
                let website = "";

                const liElements = document.querySelectorAll(
                  "li.d-flex.align-items-start.gap-2"
                );
                if (liElements[0]) {
                  const spanElement = liElements[0].querySelector("span");
                  if (spanElement) {
                    locations = [spanElement.textContent?.trim() || ""];
                  }
                }

                if (liElements[1]) {
                  const aElement = liElements[1].querySelector(
                    'a[rel="nofollow"]'
                  ) as HTMLAnchorElement;
                  if (aElement && aElement.href) {
                    website = aElement.href;
                  }
                }

                document.querySelectorAll('a[rel="nofollow"]').forEach((el) => {
                  const text = el.textContent?.trim() || "";
                  if (text.includes("@")) contactEmail = text;
                  if (/\d{8,}/.test(text)) phone = text;
                });

                return {
                  companyName,
                  contactEmail,
                  description,
                  phone,
                  website,
                  companySize,
                  industries,
                  locations,
                  logo,
                };
              });

              // Lấy danh sách job
              const jobLinks = await page.$$eval(
                "a.text-decoration-none.text-dark.d-block.h-100",
                (els) => els.map((e) => e.href)
              );
              const jobs: JobInput[] = [];

              for (const jobUrl of jobLinks) {
                try {
                  // Kiểm tra trùng lặp job
                  const jobId = this.extractJobIdFromUrl(jobUrl);
                  if (existingJobs.has(jobId)) {
                    this.logger.log(`⏭️  Skipping existing job: ${jobId}`);
                    continue;
                  }

                  await page.goto(jobUrl, { waitUntil: "networkidle2" });
                  const jobData = await page.evaluate(() => {
                    const title =
                      document
                        .querySelector("h1.job-title.mb-2.mb-sm-3.fs-4")
                        ?.textContent?.trim() || "";

                    let location = "";
                    const locationDiv1 = document.querySelector(
                      "div.location-extra.mt-2"
                    );
                    if (locationDiv1) {
                      location = locationDiv1.textContent?.trim() || "";
                    } else {
                      const locationDiv2 = document.querySelector(
                        '.job-location, .location, [class*="location"]'
                      );
                      if (locationDiv2) {
                        location = locationDiv2.textContent?.trim() || "";
                      } else {
                        const companyInfoItems = document.querySelectorAll(
                          "li.d-flex.align-items-start.gap-2"
                        );
                        if (companyInfoItems.length > 0) {
                          const firstItem = companyInfoItems[0];
                          const locationSpan = firstItem.querySelector("span");
                          if (locationSpan) {
                            location = locationSpan.textContent?.trim() || "";
                          }
                        }
                      }
                    }

                    let salaryDisplay: string | undefined = undefined;
                    const budgetSpan = document.querySelector(
                      "span.text-truncate.d-inline-block"
                    );
                    if (budgetSpan) {
                      const strong = budgetSpan.querySelector("strong");
                      if (strong) {
                        salaryDisplay = strong.textContent?.trim() || undefined;
                      }
                    }

                    let salaryMin: number | null = null;
                    let salaryMax: number | null = null;
                    if (salaryDisplay) {
                      const numbers = salaryDisplay.match(/\d+/g);
                      if (numbers && numbers.length >= 2) {
                        salaryMin = parseInt(numbers[0]);
                        salaryMax = parseInt(numbers[1]);
                      } else if (numbers && numbers.length === 1) {
                        if (
                          salaryDisplay.toLowerCase().includes("đến") ||
                          salaryDisplay.toLowerCase().includes("dưới")
                        ) {
                          salaryMax = parseInt(numbers[0]);
                        } else if (
                          salaryDisplay.toLowerCase().includes("trên") ||
                          salaryDisplay.toLowerCase().includes("từ")
                        ) {
                          salaryMin = parseInt(numbers[0]);
                        } else {
                          salaryMin = parseInt(numbers[0]);
                          salaryMax = parseInt(numbers[0]);
                        }
                      }
                    }

                    const descEls = document.querySelectorAll(
                      "div.job-detail-card"
                    );
                    let description = "";
                    if (descEls[0]) {
                      const firstInnerDiv = descEls[0].querySelector("div");
                      if (firstInnerDiv) {
                        description =
                          firstInnerDiv.textContent
                            ?.replace(/\n/g, " ")
                            ?.trim() || "";
                      }
                    }

                    let requirements: string[] = [];
                    const jobDetailCard = document.querySelector(
                      "div.job-detail-card"
                    );
                    if (jobDetailCard) {
                      const innerDivs = jobDetailCard.querySelectorAll("div");
                      if (innerDivs[1]) {
                        requirements = (innerDivs[1].textContent || "")
                          .split("\n")
                          .map((line) => line.trim())
                          .filter((line) => line.length > 0);
                      }
                    }

                    const skills = Array.from(
                      document.querySelectorAll(".tag-skill")
                    ).map((e) => e.textContent?.trim() || "");
                    if (!skills.length) {
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
                        "bán vé",
                        "chăm sóc khách hàng",
                        "telesales",
                        "bảo trì",
                        "bảo dưỡng",
                        "bảo mật",
                        "network",
                        "phần mềm",
                        "phần cứng",
                        "công nghệ thông tin",
                        "it",
                        "erp",
                        "sap",
                        "oracle",
                        "sql server",
                        "python",
                        "java",
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
                        "docker",
                        "ci/cd",
                      ];
                      const text = (
                        description +
                        " " +
                        (requirements || []).join(" ")
                      ).toLowerCase();
                      skills.push(
                        ...keywords.filter((kw) => text.includes(kw))
                      );
                    }

                    const status = "OPEN";
                    let postedDate: string | null = null;
                    const divs = document.querySelectorAll(
                      "div.col-6.col-md-4.d-flex.align-items-start"
                    );
                    divs.forEach((div) => {
                      if (div.textContent?.includes("Ngày đăng tuyển")) {
                        const strong = div.querySelector("strong");
                        if (strong) {
                          postedDate = strong.textContent?.trim() || null;
                        }
                      }
                    });

                    let expiresAt: string | null = null;
                    const deadlineLi = document.querySelector(
                      "li.col-md-auto.col-date.d-flex.align-items-center.mb-2.mb-md-0"
                    );
                    if (deadlineLi) {
                      const strong = deadlineLi.querySelector("strong");
                      if (strong) {
                        expiresAt = strong.textContent?.trim() || null;
                      }
                    }

                    return {
                      id: `job-${Date.now()}-${Math.floor(Math.random() * 1000000)}`, // ID an toàn hơn
                      title,
                      source: "jobsgo",
                      location,
                      description,
                      salaryDisplay,
                      salaryMin: salaryMin ?? undefined,
                      salaryMax: salaryMax ?? undefined,
                      skills,
                      requirements,
                      status,
                      postedDate: postedDate ?? undefined,
                      sourceUrl: window.location.href,
                      expiresAt: expiresAt ?? undefined,
                      descriptionRaw: description,
                      titleSum: title,
                      locationSum: location,
                      skillsSum: skills.join(", "),
                      descriptionSum: description,
                      requirementsSum: requirements.join("; "),
                      titleEmbedding: undefined,
                      descriptionEmbedding: undefined,
                      skillsEmbedding: undefined,
                      locationEmbedding: undefined,
                      requirementsEmbedding: undefined,
                    };
                  });

                  // Process slug outside of page.evaluate() context
                  const jobWithSlug = {
                    ...jobData,
                    id:
                      jobData.id ||
                      `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Đảm bảo có ID
                    slug: this.toSlug(jobData.title),
                  };
                  jobs.push(jobWithSlug);
                  await new Promise((r) => setTimeout(r, 1000)); // Đợi 1s để tránh bị chặn
                } catch (jobError) {
                  this.logger.error(
                    `Error crawling job ${jobUrl}: ${jobError}`
                  );
                  continue;
                }
              }

              const allJobLocations = jobs
                .map((job) => job.location)
                .filter((loc) => loc && loc.trim() !== "");
              const uniqueJobLocations = [...new Set(allJobLocations)];
              const combinedLocations = [
                ...companyData.locations,
                ...uniqueJobLocations,
              ];
              const finalUniqueLocations = [
                ...new Set(combinedLocations),
              ].filter(
                (loc): loc is string =>
                  typeof loc === "string" && loc.trim() !== ""
              );

              const companyResult: CompanyInput = {
                id: uuidv4(),
                name: companyData.companyName,
                slug: this.toSlug(companyData.companyName),
                website: companyData.website,
                description: companyData.description,
                logo: companyData.logo,
                companySize: this.mapCompanySize(companyData.companySize),
                industries: this.mapVietnameseToIndustryEnum(
                  companyData.industries
                ),
                locations: finalUniqueLocations,
                contactEmail: companyData.contactEmail,
                supportEmail: "",
                phone: companyData.phone,
                nameEmbedding: undefined,
                descriptionEmbedding: undefined,
                jobs,
              };

              results.push(companyResult);
              existingCompanies.add(companyId); // Thêm vào set để tránh crawl lại
              crawledCount++;
              this.logger.log(
                `✓ [${crawledCount}/${companyLinks.length}] Crawled company: ${companyData.companyName}`
              );
              this.logger.log(`  - Number of jobs: ${jobs.length}`);
              await new Promise((r) => setTimeout(r, 1000)); // Đợi 1s
            } catch (companyError) {
              this.logger.error(
                `Error crawling company ${link}: ${companyError}`
              );
              continue;
            }
          }

          const nextPageExists = await page.evaluate(
            (currentPageNum: number) => {
              const nextPageLink = document.querySelector(
                `a[data-page="${currentPageNum + 1}"]`
              );
              if (nextPageLink) return true;
              const nextPageHref = document.querySelector(
                `a[href*="trang-${currentPageNum + 1}.html"]`
              );
              if (nextPageHref) return true;
              const nextButton = document.querySelector(
                'a[aria-label="Next"], a.next'
              );
              return !!nextButton;
            },
            currentPage
          );

          if (nextPageExists) {
            currentPage++;
            this.logger.log(`Moving to page ${currentPage} for ${industry}`);
          } else {
            hasNextPage = false;
            this.logger.log(`Finished crawling all pages for ${industry}`);
          }

          await new Promise((r) => setTimeout(r, 2000)); // Đợi 2s giữa các trang
        }

        this.logger.log(`Completed crawling industry: ${industry}`);
        await new Promise((r) => setTimeout(r, 3000)); // Đợi 3s giữa các ngành
      }

      this.logger.log("\n=== CRAWL COMPLETED ===");
      this.logger.log(`Total industries crawled: ${industries.length}`);
      this.logger.log(`Total companies crawled: ${results.length}`);
      this.logger.log(
        `Unique companies: ${new Set(results.map((c) => c.name)).size}`
      );
      return results;
    } catch (error) {
      this.logger.error(`Failed to crawl JobGo: ${error}`);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
