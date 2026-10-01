import { describe, expect, it } from "vitest";
import { tools } from "../src/data/tools";
import { categories } from "../src/data/categories";

describe("tool registry", () => {
  // Prompt: "Do not add or remove tools silently". Ye test is usool ko lagu karta hai.
  // Jab owner naya tool approve kare, tab ye number jaan boojh kar badlein.
  it("contains the approved inventory", () => {
    expect(tools).toHaveLength(70);
  });

  it("has unique ids and slugs", () => {
    expect(new Set(tools.map((t) => t.id)).size).toBe(tools.length);
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length);
  });

  it("uses URL-safe slugs", () => {
    for (const t of tools) {
      expect(t.slug, t.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("assigns every tool to an existing category", () => {
    const slugs = new Set(categories.map((c) => c.slug));
    for (const t of tools) {
      expect(slugs.has(t.category), t.name).toBe(true);
    }
  });

  it("explains why a tool is blocked", () => {
    const blocked = tools.filter((t) => t.status === "blocked_for_review");
    expect(blocked.length).toBeGreaterThan(0);
    for (const t of blocked) {
      expect(t.reviewNote, t.name).toBeTruthy();
    }
  });

  it("has no empty required fields", () => {
    for (const t of tools) {
      expect(t.name.trim(), t.id).not.toBe("");
      expect(t.description.trim(), t.id).not.toBe("");
      expect(t.icon.trim(), t.id).not.toBe("");
      expect(t.tags.length, t.id).toBeGreaterThan(0);
    }
  });
});