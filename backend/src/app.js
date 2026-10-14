import cors from "cors";
import express from "express";
import { getClientOrigin } from "./config/auth.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: getClientOrigin(),
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/loans", loanRoutes);

app.use(errorHandler);

export default app;
