import { GenericCrawler } from "./generic";
import { CompanyInput, CrawlerOptions, CrawlerCssConfig } from "../interfaces";

export class TopCVCrawler extends GenericCrawler {
  static readonly BASE_URL = "https://www.topcv.vn";
  static readonly DEFAULT_LIST_URL = "https://www.topcv.vn/tim-viec-lam-moi-nhat";

  static readonly DEFAULT_CONFIG: CrawlerCssConfig = {
    list: {
      container: ".job-item-search-result[data-job-id]",
      title: { selector: "h3.title a span", extract: "text" },
      jobUrl: { selector: "h3.title a", extract: "attr", attrName: "href" },
      companyName: { selector: "a.company span.company-name", extract: "text" },
      logo: {
        selector: ".avatar img",
        extract: "attr",
        attrName: "data-src",
      },
      salary: { selector: ".label-content label.salary span", extract: "text" },
      location: { selector: "label.address span.city-text", extract: "text" },
      tags: { selector: ".tag .item-tag", extract: "text", isMultiple: true },
      yearsOfExperience: { selector: "label.exp span", extract: "text" },
      postedAt: { selector: "label.label-update", extract: "attr", attrName: "data-original-title" },
      companyUrl: { selector: "a.company", extract: "attr", attrName: "href" },
      extraTags: { selector: ".remaining-items", extract: "attr", attrName: "data-original-title" },
    },
    detail: {
      description: {
        selector: ".job-description__item--content",
        extract: "text",
      },
      requirements: {
        selector: ".job-description__item.requirement .job-description__item--content",
        extract: "text",
        isMultiple: true,
      },
      benefits: {
        selector: ".job-description__item.benefit .job-description__item--content",
        extract: "text",
        isMultiple: true,
      },
      jobLevelName: {
        selector: ".box-general-group-info:contains('Cấp bậc') .box-general-group-info-value",
        extract: "text",
      },
      workArrangement: {
        selector: ".box-general-group-info:contains('Hình thức làm việc') .box-general-group-info-value",
        extract: "text",
      },
      companySize: {
        selector: ".company-scale .company-value",
        extract: "text",
      },
      companyIndustry: {
        selector: ".company-field .company-value",
        extract: "text",
      },
      companyAddress: {
        selector: ".company-address .company-value",
        extract: "text",
      },
      companyUrl: {
        selector: ".job-detail__company--link a",
        extract: "attr",
        attrName: "href",
      },
    },
    behavior: {
      lazyLoadList: true,
      delayMs: [2000, 4000],
    },
  };

  protected sourceName = "topcv";

  async crawl(options?: CrawlerOptions): Promise<CompanyInput[]> {
    return super.crawl({
      ...options,
      url: options?.url || TopCVCrawler.DEFAULT_LIST_URL,
      cssConfig: options?.cssConfig || TopCVCrawler.DEFAULT_CONFIG,
    });
  }
}
