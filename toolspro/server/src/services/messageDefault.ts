import { createMongoMessageRepo } from "./messageRepo";
import { createMessageService } from "./messageService";

// Asli (MongoDB wali) service; tests apni jhooti repo ke saath createMessageService chalate hain.
export const messageService = createMessageService({ repo: createMongoMessageRepo() });
