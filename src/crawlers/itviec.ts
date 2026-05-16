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
      postedAt: { selector: ".distance-time", extract: "text" },
      yearsOfExperience: { selector: "span:contains('Experience')", extract: "text" },
      jobLevelName: { selector: "label:contains('Cấp bậc') + p", extract: "text" },
      workArrangement: { selector: "label:contains('Hình thức') + p", extract: "text" },
      extraExtracts: {
        jobImage: {
          selector: ".logo-wrapper img",
          extract: "attr",
          attrName: "src",
        },
      },
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
      companyIndustry: { selector: ".company-info .industry", extract: "text" },
      companySize: { selector: ".company-info .size", extract: "text" },
      companyUrl: { selector: ".company-info a", extract: "attr", attrName: "href" },
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
