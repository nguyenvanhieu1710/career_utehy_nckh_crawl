import { GenericCrawler } from "./generic";
import { CompanyInput, CrawlerOptions, CrawlerCssConfig } from "../interfaces";

export class ITviecCrawler extends GenericCrawler {
  static readonly BASE_URL = "https://itviec.com";
  static readonly DEFAULT_LIST_URL = "https://itviec.com/viec-lam-it";

  static readonly ITVIEC_CONFIG: CrawlerCssConfig = {
    list: {
      container: ".job-card",
      title: { selector: "h3", extract: "text" },
      jobUrl: { selector: "h3", extract: "attr", attrName: "data-url" },
      companyName: { selector: "span.ims-2 a", extract: "text" },
      logo: {
        selector: ".logo-employer-card img",
        extract: "attr",
        attrName: "src",
      },
      salary: { selector: ".salary", extract: "text" },
      location: { selector: "div[title] .text-truncate", extract: "text" },
      tags: { selector: ".itag", extract: "text", isMultiple: true },
    },
    detail: {
      description: {
        selector: ".job-content .paragraph:has(h2:contains('Mô tả công việc'))",
        extract: "text",
      },
      requirements: {
        selector:
          ".job-content .paragraph:has(h2:contains('Yêu cầu công việc'))",
        extract: "text",
      },
      benefits: {
        selector:
          ".job-content .paragraph:has(h2:contains('Tại sao bạn sẽ yêu thích'))",
        extract: "text",
      },
    },
    behavior: {
      lazyLoadList: true,
      delayMs: [2000, 4000],
    },
  };

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    return super.crawl({
      ...options,
      url: options?.url || ITviecCrawler.DEFAULT_LIST_URL,
      cssConfig: ITviecCrawler.ITVIEC_CONFIG,
    });
  }
}
