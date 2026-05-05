import { GenericCrawler } from "./generic";
import { CompanyInput, CrawlerOptions, CrawlerCssConfig } from "../interfaces";

export class Vieclam24hCrawler extends GenericCrawler {
  static readonly BASE_URL = "https://vieclam24h.vn";
  static readonly DEFAULT_LIST_URL =
    "https://vieclam24h.vn/tim-kiem-viec-lam-nhanh";

  // Bộ cấu hình mặc định (Fallback) dựa trên cấu hình HTML mới nhất
  static readonly DEFAULT_CONFIG: CrawlerCssConfig = {
    list: {
      container: "a[data-job-id]",
      title: { selector: "h3.text-\\[16px\\]", extract: "text" },
      jobUrl: { selector: "self", extract: "attr", attrName: "href" },
      companyName: { selector: "h3.text-\\[14px\\]", extract: "text" },
      logo: { selector: "figure img", extract: "attr", attrName: "src" },
      salary: { selector: ".svicon-money-circle + span", extract: "text" },
      location: { selector: ".svicon-location + span", extract: "text" },
      tags: {
        selector: ".flex-1.gap-\\[6px\\] span",
        extract: "text",
        isMultiple: true,
      },
    },
    detail: {
      description: {
        selector: "h2:contains('Mô tả công việc') + div",
        extract: "text",
      },
      requirements: {
        selector: "h2:contains('Yêu cầu công việc') + div",
        extract: "text",
      },
      benefits: {
        selector: "h2:contains('Quyền lợi') + div",
        extract: "text",
      },
      skills: {
        selector: "h2:contains('Kỹ năng') + div div:not(:contains('•'))",
        extract: "text",
        isMultiple: true,
      },
    },
    behavior: {
      lazyLoadList: true,
      delayMs: [2000, 4000],
    },
  };

  protected sourceName = "vieclam24h";

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    return super.crawl({
      ...options,
      url: options?.url || Vieclam24hCrawler.DEFAULT_LIST_URL,
      // Ưu tiên cssConfig từ body, nếu không có thì dùng bộ mặc định
      cssConfig: options?.cssConfig || Vieclam24hCrawler.DEFAULT_CONFIG,
    });
  }
}
