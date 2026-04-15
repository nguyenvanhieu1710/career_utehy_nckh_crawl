import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { CompanyEntity } from "../entities/company.entity";
import { JobEntity } from "../entities/job.entity";

dotenv.config();

const connectionUrl = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: "postgres",
  ...(connectionUrl
    ? { url: connectionUrl }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      }),
  synchronize: false,
  logging: false,
  entities: [CompanyEntity, JobEntity],
});

export const connectPostgres = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Connected to PostgreSQL");
  } catch (error) {
    console.error("PostgreSQL connection error:", error);
  }
};
