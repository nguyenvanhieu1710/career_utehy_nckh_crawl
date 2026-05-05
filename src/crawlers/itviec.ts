import { GenericCrawler } from "./generic";
import { CompanyInput, CrawlerOptions, CrawlerCssConfig } from "../interfaces";

export class ITviecCrawler extends GenericCrawler {
  static readonly BASE_URL = "https://itviec.com";
  static readonly DEFAULT_LIST_URL = "https://itviec.com/viec-lam-it";

  static readonly DEFAULT_CONFIG: CrawlerCssConfig = {
    list: {
      container: ".job-card",
      title: { selector: "h3", extract: "text" },
      jobUrl: { selector: "h3", extract: "attr", attrName: "data-url" },
      companyName: { selector: "span.ims-2 a", extract: "text" },
      logo: {
        selector: ".logo-employer-card img",
        extract: "attr",
        attrName: "data-src", // ITviec dùng lazyload data-src
      },
      salary: { selector: ".salary span", extract: "text" },
      location: { selector: "div[title].text-truncate", extract: "text" },
      tags: { selector: ".itag", extract: "text", isMultiple: true },
    },
    detail: {
      description: {
        selector: ".job-content .paragraph:contains('Mô tả công việc')",
        extract: "text",
      },
      requirements: {
        selector: ".job-content .paragraph:contains('Yêu cầu công việc') li",
        extract: "text",
        isMultiple: true,
      },
      benefits: {
        selector:
          ".job-content .paragraph:contains('Tại sao bạn sẽ yêu thích') li",
        extract: "text",
        isMultiple: true,
      },
      skills: {
        selector: ".itag",
        extract: "text",
        isMultiple: true,
      },
    },
    behavior: {
      lazyLoadList: true,
      delayMs: [2000, 4000],
    },
  };

  protected sourceName = "itviec";

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    return super.crawl({
      ...options,
      url: options?.url || ITviecCrawler.DEFAULT_LIST_URL,
      cssConfig: options?.cssConfig || ITviecCrawler.DEFAULT_CONFIG,
    });
  }
}
