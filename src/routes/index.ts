import { Router } from "express";
import jobsRouter from "./jobs.route";
import crawlRouter from "./crawl.route";

const router = Router();

router.use("/api", jobsRouter);
router.use("/api/crawl", crawlRouter);

export default router;
