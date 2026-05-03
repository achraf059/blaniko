import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "blaniko-backend" });
});

app.listen(PORT, () => {
  console.log(`blaniko-backend running on http://localhost:${PORT}`);
});
