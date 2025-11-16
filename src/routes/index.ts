import { Router } from "express";
import jobsRouter from "./jobs.route";

const router = Router();

router.use("/api", jobsRouter);

export default router;
