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
 *            maxPages?: number,      // Số trang tối đa
 *            fetchDetail?: boolean,  // Có crawl thêm trang detail để lấy description không
 *            saveToDb?: boolean,     // Có lưu vào database không
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
 * @route   POST /api/crawl/itviec
 * @desc    Crawl dữ liệu từ ITviec (itviec.com)
 * @access  Public
 * @body    {
 *            url?: string,           // Base URL, mặc định: https://itviec.com
 *            maxPages?: number,      // Số trang tối đa
 *            fetchDetail?: boolean,  // Có crawl thêm trang detail để lấy description không
 *            saveToDb?: boolean      // Có lưu vào database không
 *          }
 */
router.post("/itviec", CrawlController.crawlITviec);

/**
 * @route   POST /api/crawl/vieclam24h
 * @desc    Crawl dữ liệu từ Vieclam24h
 * @access  Public
 * @body    {
 *            url?: string,           // Base URL, mặc định: https://vieclam24h.vn
 *            maxPages?: number,      // Số trang tối đa
 *            fetchDetail?: boolean,  // Có crawl thêm trang detail để lấy description không
 *            saveToDb?: boolean,     // Có lưu vào database không
 *            cssConfig?: CrawlerCssConfig  // Cấu hình CSS cho việc crawl
 *          }
 */
router.post("/vieclam24h", CrawlController.crawlVieclam24h);

/**
 * @route   POST /api/crawl/push-job
 * @desc    Centralized dispatcher to route crawl requests based on source
 * @access  Public
 */
router.post("/push-job", CrawlController.dispatch);

export default router;
