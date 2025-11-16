import express, { Request, Response } from "express";
import routes from "./routes";

const app = express();

app.use(express.json());
app.use(routes);

// Endpoint health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Server is running" });
});

export default app;
