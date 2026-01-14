import express from "express";
import { JobsController } from "../controllers";

const router = express.Router();

// GET /api/jobs: Lấy danh sách công việc
router.get("/jobs", JobsController.getJobs);

export default router;
