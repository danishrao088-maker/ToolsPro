import { createMongoShortUrlRepo } from "./shortUrlRepo";
import { createShortUrlService } from "./shortUrlService";

// Asli (MongoDB wali) service. Tests is file ki jagah createShortUrlService ko apni jhooti repo ke saath chalate hain.
export const shortUrlService = createShortUrlService({ repo: createMongoShortUrlRepo() });