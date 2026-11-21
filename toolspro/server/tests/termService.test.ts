import { describe, expect, it } from "vitest";
import type { TermRecord } from "../src/services/blogTypes";
import { createTermService } from "../src/services/termService";
import { fakeTermRepo } from "./fakeBlogRepo";

const code = (promise: Promise<unknown>) => promise.then(() => "no error", (e: { code?: string }) => e.code ?? "other");
const term = (n: number, extra: Partial<TermRecord> = {}): TermRecord => ({
  id: `65b00000000000000000000${n}`,
  name: `Term ${n}`,
  slug: `term-${n}`,
  description: "",
  postCount: 0,
  ...extra,
});

function setup(initial: TermRecord[] = [], label: "category" | "tag" = "category") {
  const fake = fakeTermRepo(initial);
  return { ...fake, service: createTermService({ repo: fake.repo, label }) };
}

describe("create", () => {
  it("makes a slug from the name", async () => {
    const { service, terms } = setup();
    expect(await service.create({ name: "Web Tools", description: "All about tools" })).toMatchObject({ name: "Web Tools", slug: "web-tools", description: "All about tools", postCount: 0 });
    expect(terms).toHaveLength(1);
  });
  it("numbers the slug when the name repeats", async () => {
    const { service } = setup();
    expect((await service.create({ name: "News" })).slug).toBe("news");
    expect((await service.create({ name: "News" })).slug).toBe("news-2");
  });
  it("keeps a chosen slug and refuses one that is taken, naming the kind", async () => {
    const { service } = setup([term(1, { slug: "taken" })], "tag");
    expect((await service.create({ name: "A", slug: "Mine" })).slug).toBe("mine");
    await expect(service.create({ name: "B", slug: "taken" })).rejects.toMatchObject({ code: "SLUG_TAKEN", statusCode: 409, message: expect.stringContaining("tag") });
  });
  it("retries when the database reports a clash", async () => {
    const { service, repo, calls } = setup();
    repo.forceDuplicates = 2;
    expect((await service.create({ name: "News" })).slug).toBe("news");
    expect(calls.insert).toBe(3);
    repo.forceDuplicates = 10;
    expect(await code(service.create({ name: "More" }))).toBe("SLUG_UNAVAILABLE");
    repo.forceDuplicates = 1;
    expect(await code(service.create({ name: "Chosen", slug: "chosen" }))).toBe("SLUG_TAKEN");
  });
  it("refuses bad input", async () => {
    const { service, calls } = setup();
    expect(await code(service.create({}))).toBe("VALIDATION_ERROR");
    expect(await code(service.create({ name: "x", slug: "Bad Slug" }))).toBe("VALIDATION_ERROR");
    expect(calls.insert).toBe(0);
  });
});

describe("update", () => {
  it("changes the name and keeps the slug unless a new one is sent", async () => {
    const { service } = setup([term(1)]);
    expect(await service.update(term(1).id, { name: "Renamed" })).toMatchObject({ name: "Renamed", slug: "term-1" });
    expect(await service.update(term(1).id, { name: "Renamed", slug: "fresh" })).toMatchObject({ slug: "fresh" });
  });
  it("refuses a slug another one uses, but allows its own", async () => {
    const { service } = setup([term(1), term(2)]);
    expect(await code(service.update(term(1).id, { name: "x", slug: "term-2" }))).toBe("SLUG_TAKEN");
    expect((await service.update(term(1).id, { name: "x", slug: "term-1" })).slug).toBe("term-1");
  });
  it("answers not found for a missing or malformed id", async () => {
    const { service } = setup([term(1)]);
    expect(await code(service.update("65b0000000000000000009ff", { name: "x" }))).toBe("NOT_FOUND");
    expect(await code(service.update("nope", { name: "x" }))).toBe("NOT_FOUND");
  });
});

describe("remove", () => {
  it("deletes, and says not found the second time", async () => {
    const { service, terms } = setup([term(1)]);
    await service.remove(term(1).id);
    expect(terms).toHaveLength(0);
    expect(await code(service.remove(term(1).id))).toBe("NOT_FOUND");
    expect(await code(service.remove("nope"))).toBe("NOT_FOUND");
  });
});

describe("list", () => {
  it("gives the admin every term with the post count and id", async () => {
    const { service } = setup([term(1, { postCount: 4 }), term(2, { postCount: 0 })]);
    expect(await service.list()).toEqual([
      { id: term(1).id, name: "Term 1", slug: "term-1", description: "", postCount: 4 },
      { id: term(2).id, name: "Term 2", slug: "term-2", description: "", postCount: 0 },
    ]);
  });
  it("gives the public only terms that have published posts, without ids", async () => {
    const { service } = setup([term(1, { postCount: 4 }), term(2, { postCount: 0 }), term(3, { postCount: 1 })]);
    const list = await service.listPublic();
    expect(list.map((t) => t.slug)).toEqual(["term-1"]); // fake repo public me count aadha karta hai: 4->2, 1->0, 0->0
    expect(list[0]).not.toHaveProperty("id");
    expect(list[0]).toEqual({ name: "Term 1", slug: "term-1", description: "", postCount: 2 });
  });
});