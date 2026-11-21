import { createInterface } from "node:readline";
import { Writable } from "node:stream";

// Terminal me ek sawal poochta hai. hidden=true ho to likhte waqt harf screen par nahi dikhte (password ke liye).
export function ask(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
    muted = hidden;
  });
}