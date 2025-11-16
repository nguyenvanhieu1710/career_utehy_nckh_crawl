import { JobInput } from "./job.interface";

export interface CompanyInput {
  id: string;
  name: string;
  slug: string;
  website?: string;
  description?: string;
  logo?: string;
  companySize?: string;
  industries?: string[];
  locations?: string[];
  contactEmail?: string;
  supportEmail?: string;
  phone?: string;
  nameEmbedding?: number[];
  descriptionEmbedding?: number[];
  jobs: JobInput[];
}
