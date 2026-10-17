import cors from "cors";
import express from "express";
import { getClientOrigin } from "./config/auth.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import readingStatusRoutes from "./routes/readingStatusRoutes.js";

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
app.use("/api/reading-status", readingStatusRoutes);
app.use("/api/reservations", reservationRoutes);

app.use(errorHandler);

export default app;
