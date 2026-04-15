export type DetectedSource = "jobgo" | "vietnamworks" | "topcv" | "unknown";

export function detectSourceFromUrl(url: string): DetectedSource {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (hostname.includes("jobsgo.vn") || hostname.includes("jobgo.vn")) return "jobgo";
        if (hostname.includes("vietnamworks.com")) return "vietnamworks";
        if (hostname.includes("topcv.vn")) return "topcv";
        return "unknown";
    } catch {
        return "unknown";
    }
}
