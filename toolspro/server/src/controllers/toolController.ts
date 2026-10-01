import type { Request, Response } from "express";
import { getActiveTools, getCategoriesWithCounts } from "../services/toolService";
import { toolsQuerySchema } from "../validators/toolValidators";
import { AppError } from "../utils/AppError";

export function listTools(req: Request, res: Response): void {
  const parsed = toolsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_QUERY", "Invalid category filter");
  }
  res.json({ success: true, data: getActiveTools(parsed.data.category) });
}

export function listCategories(_req: Request, res: Response): void {
  res.json({ success: true, data: getCategoriesWithCounts() });
}