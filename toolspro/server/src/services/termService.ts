import { AppError } from "../utils/AppError";
import { isObjectIdString, slugify, uniqueSlug } from "./blogText";
import { parseTermInput } from "./blogInput";
import type { TermRepo } from "./blogTypes";
import { adminTermView, publicTermView } from "./blogView";

// Category aur tag ek jaisay hain, is liye ek hi service dono ke liye (label sirf paigham ke liye).
export interface TermDeps {
  repo: TermRepo;
  label: "category" | "tag";
  maxAttempts?: number;
}

export function createTermService(deps: TermDeps) {
  const { repo, label } = deps;
  const maxAttempts = deps.maxAttempts ?? 3;
  const notFound = () => new AppError(404, "NOT_FOUND", `That ${label} was not found.`);
  const slugTaken = () => new AppError(409, "SLUG_TAKEN", `This slug is already used by another ${label}. Choose a different one.`);

  async function list() {
    return (await repo.list({ publishedOnly: false })).map(adminTermView);
  }

  // Public: sirf wo jin me kam az kam ek published post ho
  async function listPublic() {
    return (await repo.list({ publishedOnly: true })).filter((term) => term.postCount > 0).map(publicTermView);
  }

  async function create(body: unknown) {
    const input = parseTermInput(body, label);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let slug: string;
      if (input.slug) {
        slug = input.slug;
        if (await repo.slugTaken(slug)) throw slugTaken();
      } else {
        slug = await uniqueSlug(slugify(input.name), (candidate) => repo.slugTaken(candidate));
      }
      const result = await repo.insert({ name: input.name, slug, description: input.description });
      if (result !== "duplicate") return adminTermView(result);
      if (input.slug) throw slugTaken();
    }
    throw new AppError(503, "SLUG_UNAVAILABLE", "A web address could not be created right now. Please try again.");
  }

  async function update(id: string, body: unknown) {
    if (!isObjectIdString(id)) throw notFound();
    const current = await repo.findById(id);
    if (!current) throw notFound();
    const input = parseTermInput(body, label);
    const slug = input.slug ?? current.slug;
    if (slug !== current.slug && (await repo.slugTaken(slug, current.id))) throw slugTaken();
    const result = await repo.update(current.id, { name: input.name, slug, description: input.description });
    if (result === "duplicate") throw slugTaken();
    if (!result) throw notFound();
    return adminTermView(result);
  }

  // Hatane par is se jure posts band nahi hote, bas unse ye category/tag hat jata hai
  async function remove(id: string): Promise<void> {
    if (!isObjectIdString(id) || !(await repo.remove(id))) throw notFound();
  }

  return { list, listPublic, create, update, remove };
}

export type TermService = ReturnType<typeof createTermService>;