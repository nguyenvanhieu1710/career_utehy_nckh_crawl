import { GenericCrawler } from "./generic";
import { CompanyInput, CrawlerOptions, CrawlerCssConfig } from "../interfaces";

export class JobGoCrawler extends GenericCrawler {
  static readonly BASE_URL = "https://jobsgo.vn";
  static readonly DEFAULT_LIST_URL = "https://jobsgo.vn/viec-lam.html";

  static readonly DEFAULT_CONFIG: CrawlerCssConfig = {
    list: {
      container: ".col-grid",
      title: { selector: "h3.job-title", extract: "text" },
      jobUrl: {
        selector: "a.text-decoration-none",
        extract: "attr",
        attrName: "href",
      },
      companyName: { selector: ".company-title", extract: "text" },
      logo: {
        selector: ".image-wrapper img",
        extract: "attr",
        attrName: "src", // JobsGo dùng src trực tiếp cho logo ở trang danh sách
      },
      salary: {
        selector: ".mt-1.text-primary span:first-child",
        extract: "text",
      },
      location: {
        selector: ".mt-1.text-primary span:last-child",
        extract: "text",
      },
      yearsOfExperience: {
        selector: "span:contains('Kinh nghiệm')",
        extract: "text",
      },
      postedAt: { selector: ".time-release", extract: "text" },
      extraExtracts: {
        jobImage: {
          selector: ".image-wrapper img",
          extract: "attr",
          attrName: "src",
        },
      },
    },
    detail: {
      description: {
        selector:
          ".job-detail-content .content-group:contains('Mô tả công việc'), .job-detail-card:contains('Mô tả công việc')",
        extract: "text",
      },
      requirements: {
        selector:
          ".job-detail-content .content-group:contains('Yêu cầu công việc') li, .job-detail-card:contains('Yêu cầu công việc') li",
        extract: "text",
        isMultiple: true,
      },
      benefits: {
        selector:
          ".job-detail-content .content-group:contains('Quyền lợi') li, .job-detail-card:contains('Quyền lợi') li",
        extract: "text",
        isMultiple: true,
      },
      companyIndustry: { selector: ".company-industry", extract: "text" },
      companySize: { selector: ".company-size", extract: "text" },
      companyUrl: {
        selector: ".company-url a",
        extract: "attr",
        attrName: "href",
      },
      expiresAt: {
        selector:
          ".job-deadline, [class*='deadline'], span:contains('Hạn nộp') + span",
        extract: "text",
      },
    },
    behavior: {
      lazyLoadList: true,
      delayMs: [1000, 2000],
    },
  };

  protected sourceName = "jobgo";

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    return super.crawl({
      ...options,
      url: options?.url || JobGoCrawler.DEFAULT_LIST_URL,
      cssConfig: options?.cssConfig || JobGoCrawler.DEFAULT_CONFIG,
    });
  }

  // Tùy chỉnh URL phân trang cho JobsGo
  protected getPageUrl(baseUrl: string, pageNum: number): string {
    if (pageNum <= 1) return baseUrl;
    const connector = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${connector}page=${pageNum}`;
  }
}
