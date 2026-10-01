import { z } from "zod";
import { categories } from "../data/categories";

const slugs = categories.map((c) => c.slug) as [string, ...string[]];

export const toolsQuerySchema = z.object({
  category: z.enum(slugs).optional(),
});
