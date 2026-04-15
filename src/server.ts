import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/db.config";
import { connectPostgres } from "./config/postgres.config";

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await connectPostgres();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
