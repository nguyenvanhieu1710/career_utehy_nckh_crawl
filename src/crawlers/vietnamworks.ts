import { GenericCrawler } from "./generic";
import { CompanyInput, CrawlerOptions, CrawlerCssConfig } from "../interfaces";

export class VietnamWorksCrawler extends GenericCrawler {
  static readonly BASE_URL = "https://www.vietnamworks.com";
  static readonly DEFAULT_LIST_URL = "https://www.vietnamworks.com/viec-lam";

  static readonly DEFAULT_CONFIG: CrawlerCssConfig = {
    list: {
      container: ".search_list.view_job_item",
      title: { selector: "h2 a", extract: "text" },
      jobUrl: { selector: "h2 a", extract: "attr", attrName: "href" },
      companyName: { selector: ".sc-cpgxJx.gUZzDT a", extract: "text" },
      logo: {
        selector: ".sc-cHHTbD.exPzkH img",
        extract: "attr",
        attrName: "src",
      },
      salary: { selector: ".sc-dauhQT.cfzaBi", extract: "text" },
      location: { selector: ".sc-jNUliw.kVIiDJ", extract: "text" },
      tags: {
        selector: ".sc-kQwWFH.gxyerW li label",
        extract: "text",
        isMultiple: true,
      },
      yearsOfExperience: {
        selector: "label:contains('Kinh nghiệm') + p",
        extract: "text",
      },
      jobLevelName: {
        selector: "label:contains('Cấp bậc') + p",
        extract: "text",
      },
      workArrangement: {
        selector: "label:contains('Hình thức') + p",
        extract: "text",
      },
    },
    detail: {
      description: {
        selector: "h2:contains('Mô tả công việc') + *",
        extract: "text",
      },
      requirements: {
        selector: "h2:contains('Yêu cầu công việc') + *",
        extract: "text",
        isMultiple: true,
      },
      benefits: {
        selector: ".sc-c683181c-2.fGxLZh",
        extract: "text",
        isMultiple: true,
      },
      skills: {
        selector: "label:contains('KỸ NĂNG') + p",
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
      delayMs: [3000, 5000],
    },
  };

  protected sourceName = "vietnamworks";

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    return super.crawl({
      ...options,
      url: options?.url || VietnamWorksCrawler.DEFAULT_LIST_URL,
      cssConfig: options?.cssConfig || VietnamWorksCrawler.DEFAULT_CONFIG,
    });
  }
}
