import { CompanyInput } from "./company.interface";

export interface SelectorConfig {
  selector: string;
  extract: "text" | "attr" | "html";
  attrName?: string;
  isMultiple?: boolean; // Nếu lấy ra nhiều text/html (như list tag)
}

export interface CrawlerCssConfig {
  list: {
    container: string;
    title: SelectorConfig;
    jobUrl: SelectorConfig;
    companyName: SelectorConfig;
    logo?: SelectorConfig;
    salary?: SelectorConfig;
    location?: SelectorConfig;
    tags?: SelectorConfig;
    extraExtracts?: Record<string, SelectorConfig>; // Lấy những trường phụ nếu có
  };
  detail?: {
    description: SelectorConfig;
    requirements?: SelectorConfig;
    benefits?: SelectorConfig;
    expiresAt?: SelectorConfig;
  };
  // Cấu hình hành vi chung của trang
  behavior?: {
    lazyLoadList?: boolean; // Tự cuộn để load item
    delayMs?: [number, number]; // [min, max] delay cho từng request
  };
}

export interface CrawlerOptions {
  url?: string;
  maxPages?: number;
  fetchDetail?: boolean;
  existingCompanies?: Set<string>;
  existingJobs?: Set<string>;
  cssConfig?: CrawlerCssConfig;
  [key: string]: any;
}

export interface ICrawler {
  crawl(options?: CrawlerOptions): Promise<CompanyInput[]>;
}
