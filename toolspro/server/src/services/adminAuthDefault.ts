import { env } from "../config/env";
import { createRequireAdmin } from "../middleware/adminGuard";
import { createAdminAuthService } from "./adminAuthService";
import { createMongoAdminRepo } from "./adminAuthRepo";

// Asli (MongoDB wali) service. Tests is file ki jagah createAdminAuthService ko apni jhooti repo ke saath chalate hain.
export const adminAuthService = createAdminAuthService({ repo: createMongoAdminRepo(), secret: env.ADMIN_SESSION_SECRET });

// Aage ke admin routes (posts, upload...) isi ko use karenge
export const requireAdmin = createRequireAdmin(adminAuthService);