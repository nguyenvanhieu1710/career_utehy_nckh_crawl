import { v4 as uuidv4 } from "uuid";
import { CompanyInput, JobInput } from "../interfaces";

// Interface cho response từ VietnamWorks API
interface VietnamWorksJobAttributes {
    alias: string;
    jobTitle: string;
    companyName: string;
    languageId: number;
    onlineTopJobDate: string;
    typeTopJob: number;
    url: string;
    cityNames: string;
    cityNamesEN: string;
    companyLogo: string;
    jobDescription: string;
    jobRequirement: string;
    jobLevelId: number;
    jobLevelName: string;
    jobLevelNameEN: string;
    salary: string;
    address: string;
    companyId: number;
    isAnonymous: number;
    jobId: number;
    prettySalary: string;
    JobInvitation: {
        jobInvitationId: number;
        status: number;
    };
}

interface VietnamWorksJob {
    type: string;
    id: number;
    attributes: VietnamWorksJobAttributes;
}

interface VietnamWorksMeta {
    total: number;
    totalPage: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
}

interface VietnamWorksResponse {
    meta: VietnamWorksMeta;
    data: VietnamWorksJob[];
}

export class VietnamWorksCrawler {
    private static readonly logger = console;
    private static readonly API_URL =
        "https://ms.vietnamworks.com/premium-jobs/v1.0/featured-jobs";

    // Hàm chuyển chuỗi thành slug
    private static toSlug(str: string): string {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    // Parse salary từ string, ví dụ: "$350 - $550" hoặc "Negotiable"
    private static parseSalary(salary: string): {
        salaryMin?: number;
        salaryMax?: number;
        salaryDisplay: string;
    } {
        const result: { salaryMin?: number; salaryMax?: number; salaryDisplay: string } = {
            salaryDisplay: salary,
        };

        if (!salary || salary.toLowerCase() === "negotiable" || salary === "Thương lượng") {
            return result;
        }

        // Match pattern like "$350 - $550" or "350 - 550"
        const rangeMatch = salary.match(/\$?\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/);
        if (rangeMatch) {
            result.salaryMin = parseInt(rangeMatch[1].replace(/,/g, ""));
            result.salaryMax = parseInt(rangeMatch[2].replace(/,/g, ""));
            return result;
        }

        // Match single number
        const singleMatch = salary.match(/\$?\s*([\d,]+)/);
        if (singleMatch) {
            const value = parseInt(singleMatch[1].replace(/,/g, ""));
            result.salaryMin = value;
            result.salaryMax = value;
        }

        return result;
    }

    // Extract skills từ job description và requirements
    private static extractSkills(description: string, requirements: string): string[] {
        const keywords = [
            "excel",
            "word",
            "powerpoint",
            "photoshop",
            "canva",
            "tiktok",
            "capcut",
            "adobe",
            "marketing",
            "sales",
            "bán hàng",
            "tư vấn",
            "giao tiếp",
            "làm việc nhóm",
            "lập kế hoạch",
            "quản lý",
            "tiếng anh",
            "english",
            "kỹ năng mềm",
            "kỹ năng giao tiếp",
            "kỹ năng lãnh đạo",
            "cầu tiến",
            "chủ động",
            "sáng tạo",
            "phân tích",
            "sql",
            "python",
            "javascript",
            "nodejs",
            "java",
            "c#",
            "html",
            "css",
            "react",
            "vue",
            "angular",
            "ai",
            "machine learning",
            "seo",
            "google ads",
            "facebook ads",
            "crm",
            "erp",
            "autocad",
            "solidworks",
            "qa",
            "qc",
            "qa/qc",
            "thiết kế",
            "quản trị",
            "phân tích dữ liệu",
            "data analysis",
            "project management",
            "scrum",
            "kanban",
            "git",
            "github",
            "gitlab",
            "docker",
            "kubernetes",
            "linux",
            "windows",
            "macos",
            "telesales",
            "bảo trì",
            "bảo dưỡng",
            "bảo mật",
            "network",
            "phần mềm",
            "phần cứng",
            "công nghệ thông tin",
            "it",
            "sap",
            "oracle",
            "sql server",
            "c++",
            "typescript",
            "reactjs",
            "vuejs",
            "angularjs",
            "node.js",
            "express",
            "mongodb",
            "mysql",
            "postgresql",
            "firebase",
            "aws",
            "azure",
            "gcp",
            "cloud",
            "ci/cd",
            "microsoft office",
            "leadership",
            "communication",
            "teamwork",
            "problem solving",
            "negotiation",
            "presentation",
        ];

        const text = (description + " " + requirements).toLowerCase();
        const foundSkills = keywords.filter((kw) => text.includes(kw));
        return [...new Set(foundSkills)];
    }

    // Parse requirements từ HTML string
    private static parseRequirements(requirementHtml: string): string[] {
        if (!requirementHtml) return [];

        // Remove HTML tags và split by newlines hoặc list items
        const text = requirementHtml
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, " ");

        return text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && line.length < 500);
    }

    // Clean HTML để lấy plain text
    private static cleanHtml(html: string): string {
        if (!html) return "";

        return html
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<\/p>/gi, " ")
            .replace(/<\/li>/gi, " ")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Map công ty vào CompanyInput
    private static mapToCompanyInput(
        companyId: number,
        companyName: string,
        companyLogo: string,
        jobs: JobInput[]
    ): CompanyInput {
        // Lấy locations từ tất cả jobs
        const allLocations = jobs
            .map((job) => job.location)
            .filter((loc): loc is string => !!loc && loc.trim() !== "");
        const uniqueLocations = [...new Set(allLocations)];

        return {
            id: uuidv4(),
            name: companyName,
            slug: this.toSlug(companyName),
            logo: companyLogo,
            locations: uniqueLocations,
            companySize: undefined,
            industries: [],
            nameEmbedding: undefined,
            descriptionEmbedding: undefined,
            jobs,
        };
    }

    // Hàm crawl dữ liệu từ VietnamWorks API
    static async crawl(options?: {
        url?: string;
        userId?: string;
        existingCompanies?: Set<string>;
        existingJobs?: Set<string>;
    }): Promise<CompanyInput[]> {
        try {
            this.logger.log("Starting VietnamWorks crawler - fetching featured jobs from API");

            const {
                url,
                userId = "8036678",
                existingCompanies = new Set<string>(),
                existingJobs = new Set<string>(),
            } = options || {};

            const timestamp = Date.now();
            const apiUrl = url || `${this.API_URL}?userId=${userId}&t=${timestamp}`;

            this.logger.log(`Fetching data from: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
            });

            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }

            const data: VietnamWorksResponse = await response.json();
            this.logger.log(`Received ${data.data.length} jobs from API`);

            // Group jobs theo company
            const companiesMap = new Map<
                number,
                {
                    companyName: string;
                    companyLogo: string;
                    jobs: JobInput[];
                }
            >();

            let skippedJobs = 0;
            let processedJobs = 0;

            for (const jobData of data.data) {
                const { attributes } = jobData;
                const jobId = attributes.jobId.toString();

                // Skip existing jobs
                if (existingJobs.has(jobId)) {
                    this.logger.log(`⏭️  Skipping existing job: ${jobId}`);
                    skippedJobs++;
                    continue;
                }

                // Parse salary
                const salaryInfo = this.parseSalary(attributes.salary);

                // Parse description và requirements
                const description = this.cleanHtml(attributes.jobDescription);
                const requirements = this.parseRequirements(attributes.jobRequirement);
                const skills = this.extractSkills(
                    attributes.jobDescription,
                    attributes.jobRequirement
                );

                // Determine location (prefer Vietnamese names)
                const location = attributes.cityNames || attributes.cityNamesEN || "";

                const job: JobInput = {
                    id: jobId,
                    title: attributes.jobTitle,
                    slug: attributes.alias || this.toSlug(attributes.jobTitle),
                    source: "vietnamworks",
                    location,
                    description,
                    salaryDisplay: attributes.prettySalary || salaryInfo.salaryDisplay,
                    salaryMin: salaryInfo.salaryMin,
                    salaryMax: salaryInfo.salaryMax,
                    skills,
                    requirements,
                    status: "OPEN",
                    postedDate: attributes.onlineTopJobDate,
                    sourceUrl: attributes.url,
                    descriptionRaw: attributes.jobDescription,
                    titleSum: attributes.jobTitle,
                    locationSum: location,
                    skillsSum: skills.join(", "),
                    descriptionSum: description.substring(0, 500),
                    requirementsSum: requirements.slice(0, 5).join("; "),
                    titleEmbedding: undefined,
                    descriptionEmbedding: undefined,
                    skillsEmbedding: undefined,
                    locationEmbedding: undefined,
                    requirementsEmbedding: undefined,
                };

                // Group by company
                const companyId = attributes.companyId;
                if (!companiesMap.has(companyId)) {
                    companiesMap.set(companyId, {
                        companyName: attributes.companyName,
                        companyLogo: attributes.companyLogo,
                        jobs: [],
                    });
                }
                companiesMap.get(companyId)!.jobs.push(job);
                existingJobs.add(jobId);
                processedJobs++;
            }

            // Convert to CompanyInput array
            const results: CompanyInput[] = [];
            let skippedCompanies = 0;

            for (const [companyId, companyData] of companiesMap) {
                const companyIdStr = companyId.toString();

                // Skip existing companies
                if (existingCompanies.has(companyIdStr)) {
                    this.logger.log(`⏭️  Skipping existing company: ${companyData.companyName}`);
                    skippedCompanies++;
                    continue;
                }

                const company = this.mapToCompanyInput(
                    companyId,
                    companyData.companyName,
                    companyData.companyLogo,
                    companyData.jobs
                );

                results.push(company);
                existingCompanies.add(companyIdStr);
                this.logger.log(
                    `✓ Processed company: ${companyData.companyName} with ${companyData.jobs.length} jobs`
                );
            }

            this.logger.log("\n=== CRAWL COMPLETED ===");
            this.logger.log(`Total jobs from API: ${data.data.length}`);
            this.logger.log(`Jobs processed: ${processedJobs}`);
            this.logger.log(`Jobs skipped (existing): ${skippedJobs}`);
            this.logger.log(`Companies processed: ${results.length}`);
            this.logger.log(`Companies skipped (existing): ${skippedCompanies}`);

            return results;
        } catch (error) {
            this.logger.error(`Failed to crawl VietnamWorks: ${error}`);
            return [];
        }
    }

    // Lấy danh sách công ty có sẵn
    static getAvailableCategories(): string[] {
        return ["featured-jobs"]; // VietnamWorks API chỉ có featured jobs
    }
}
