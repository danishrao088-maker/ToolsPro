import { app } from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";

async function start(): Promise<void> {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

void start();