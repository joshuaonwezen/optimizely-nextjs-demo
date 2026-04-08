/**
 * Registers an Optimizely Graph webhook pointing to /api/webhooks.
 *
 * Usage:
 *   npm run webhook:register
 *
 * You will be prompted for your public base URL (e.g. https://your-app.vercel.app
 * or an ngrok tunnel for local testing).
 *
 * Credentials are read from .env.local:
 *   OPTIMIZELY_APP_KEY
 *   OPTIMIZELY_APP_SECRET
 */

import { createInterface } from "readline";
import { config } from "dotenv";

config({ path: ".env.local" });

const APP_KEY = process.env.OPTIMIZELY_APP_KEY;
const APP_SECRET = process.env.OPTIMIZELY_APP_SECRET;

if (!APP_KEY || !APP_SECRET) {
  console.error(
    "Error: OPTIMIZELY_APP_KEY and OPTIMIZELY_APP_SECRET must be set in .env.local"
  );
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

const baseUrl = await question(
  "Enter your public base URL (e.g. https://your-app.vercel.app): "
);
rl.close();

const webhookUrl = `${baseUrl.trim().replace(/\/$/, "")}/api/webhooks`;
const credentials = Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64");

console.log(`\nRegistering webhook → ${webhookUrl}`);

const response = await fetch("https://cg.optimizely.com/api/webhooks", {
  method: "POST",
  headers: {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    disabled: false,
    request: {
      url: webhookUrl,
      method: "post",
    },
    topic: ["*.*"],
  }),
});

const text = await response.text();

if (!response.ok) {
  console.error(`Failed to register webhook (HTTP ${response.status}):`, text);
  process.exit(1);
}

console.log("\nWebhook registered successfully!");
try {
  console.log(JSON.parse(text));
} catch {
  console.log(text);
}
console.log(
  "\nTo list all registered webhooks, run:\n" +
    "  curl -u '<app-key>:<app-secret>' https://cg.optimizely.com/api/webhooks"
);
