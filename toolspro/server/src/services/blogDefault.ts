import { sanitizeContent } from "./blogHtml";
import { createMongoPostRepo } from "./postRepo";
import { createPostService } from "./postService";
import { createMongoTermRepo } from "./termRepo";
import { createTermService } from "./termService";

// Asli (MongoDB wali) services. Tests is file ki jagah service banane wale functions ko apni jhooti repo ke saath chalate hain.
export const postService = createPostService({ repo: createMongoPostRepo(), sanitize: sanitizeContent });
export const categoryService = createTermService({ repo: createMongoTermRepo("category"), label: "category" });
export const tagService = createTermService({ repo: createMongoTermRepo("tag"), label: "tag" });