import cors from "cors";
import express from "express";
import healthRoutes from "./routes/healthRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  }),
);

app.use(express.json());

app.use("/api/health", healthRoutes);

export default app;
