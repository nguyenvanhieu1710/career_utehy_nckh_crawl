import express from "express";
import { CrawlController } from "../controllers/crawl.controller";

const router = express.Router();

/**
 * @route   GET /api/crawl/sources
 * @desc    Lấy danh sách các nguồn crawl có sẵn
 * @access  Public
 */
router.get("/sources", CrawlController.getSources);

/**
 * @route   POST /api/crawl/jobgo
 * @desc    Crawl dữ liệu từ JobGo (jobsgo.vn)
 * @access  Public
 * @body    {
 *            url?: string,           // Base URL, mặc định: https://jobsgo.vn
 *            industries?: string[],  // Danh sách ngành nghề cần crawl
 *            maxPages?: number,      // Số trang tối đa mỗi ngành
 *            saveToDb?: boolean      // Có lưu vào database không
 *          }
 */
router.post("/jobgo", CrawlController.crawlJobGo);

/**
 * @route   POST /api/crawl/vietnamworks
 * @desc    Crawl dữ liệu từ VietnamWorks
 * @access  Public
 * @body    {
 *            url?: string,           // Base URL, mặc định: https://www.vietnamworks.com
 *            userId?: string,        // User ID cho API request
 *            saveToDb?: boolean      // Có lưu vào database không
 *          }
 */
router.post("/vietnamworks", CrawlController.crawlVietnamWorks);

/**
 * @route   POST /api/crawl/topcv
 * @desc    Crawl dữ liệu từ TopCV
 * @access  Public
 * @body    {
 *            url?: string,           // Base URL, mặc định: https://www.topcv.vn
 *            maxPages?: number,      // Số trang tối đa
 *            fetchDetail?: boolean,  // Có crawl thêm trang detail để lấy description không
 *            saveToDb?: boolean      // Có lưu vào database không
 *          }
 */
router.post("/topcv", CrawlController.crawlTopCV);

/**
 * @route   POST /api/crawl/all
 * @desc    Crawl dữ liệu từ tất cả các nguồn
 * @access  Public
 * @body    {
 *            saveToDb?: boolean,     // Có lưu vào database không
 *            jobgo?: {               // Options cho JobGo
 *              industries?: string[],
 *              maxPages?: number
 *            },
 *            vietnamworks?: {        // Options cho VietnamWorks
 *              userId?: string
 *            },
 *            topcv?: {               // Options cho TopCV
 *              url?: string,
 *              maxPages?: number,
 *              fetchDetail?: boolean
 *            }
 *          }
 */
router.post("/all", CrawlController.crawlAll);

export default router;
