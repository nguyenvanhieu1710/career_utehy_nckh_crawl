import { Schema, model } from "mongoose";
import { CompanyInput } from "../interfaces";
import { JobSchema } from "./job";

const CompanySchema = new Schema<CompanyInput>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  website: String,
  description: String,
  logo: String,
  companySize: String,
  industries: [String],
  locations: [String],
  contactEmail: String,
  supportEmail: String,
  phone: String,
  nameEmbedding: [Number],
  descriptionEmbedding: [Number],
  jobs: [JobSchema],
});

export const Company = model<CompanyInput>("Company", CompanySchema);
