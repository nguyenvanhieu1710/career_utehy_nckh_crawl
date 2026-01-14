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
 *            userId?: string,        // User ID cho API request
 *            saveToDb?: boolean      // Có lưu vào database không
 *          }
 */
router.post("/vietnamworks", CrawlController.crawlVietnamWorks);

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
 *            }
 *          }
 */
router.post("/all", CrawlController.crawlAll);

export default router;
