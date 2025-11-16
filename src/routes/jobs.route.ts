import express from "express";
import { JobsController } from "../controllers";

const router = express.Router();

// GET /api/jobs: Lấy danh sách công việc
router.get("/jobs", JobsController.getJobs);

// POST /api/crawl: Kích hoạt crawl thủ công
router.post("/crawl", JobsController.triggerCrawl);

export default router;
