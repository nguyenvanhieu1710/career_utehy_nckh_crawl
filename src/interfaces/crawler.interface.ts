import { CompanyInput } from "./company.interface";

export interface CrawlerOptions {
  url?: string;
  maxPages?: number;
  fetchDetail?: boolean;
  existingCompanies?: Set<string>;
  existingJobs?: Set<string>;
  [key: string]: any;
}

export interface ICrawler {
  crawl(options?: CrawlerOptions): Promise<CompanyInput[]>;
}
