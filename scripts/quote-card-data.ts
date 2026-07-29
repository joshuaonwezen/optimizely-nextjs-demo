// Shared QuoteBlock content items backing the homepage "Customer Voices"
// sections. Referenced by BOTH seed-quote-blocks.ts (which creates the items as
// shared blocks) and seed-content.ts (which binds them into the two
// CustomerVoicesBlock content areas). Same pattern as scripts/faq-data.ts.
//
// Keys are stable, hardcoded 32-char hex (no hyphens) because the two seed
// scripts run as separate processes and must reference the exact same items.
// Spotlights reuse the QuoteBlock type: person -> author, quote -> text, no role.

export interface QuoteCard {
  key: string;
  author: string;
  text: string;
  role?: string;
}

export const QUOTE_CARDS: QuoteCard[] = [
  { key: "cb000000000000000000000000000001", author: "Sarah Chen",    role: "Savings Customer",          text: "I moved my savings to Mosey after seeing their 5.1% AER rate. The transfer took less than a day and the app makes it easy to watch my interest grow." },
  { key: "cb000000000000000000000000000002", author: "Marcus Webb",   role: "Mortgage Customer",         text: "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer - never felt rushed." },
  { key: "cb000000000000000000000000000003", author: "Aisha Okafor",  role: "Current Account Customer",  text: "The mobile app notifications are brilliant. I know exactly where my money is going and the spending insights helped me save an extra £200 last month." },
  { key: "cb000000000000000000000000000004", author: "Tom Hartley",   role: "Business Banking Customer", text: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless - invoices reconcile automatically." },
  { key: "cb000000000000000000000000000005", author: "Priya Sharma",  role: "Current Account Customer",  text: "I had a fraud alert on my card at 2am. I called the number and got through to a real person in under a minute. Card blocked, new one dispatched, sorted." },
  { key: "cb000000000000000000000000000006", author: "Daniel Reeves", role: "Current Account Customer",  text: "Switched from my old bank after 12 years. Mosey's CASS switch took 7 working days and every direct debit moved without any issues whatsoever." },
];

// Keys use a 5b… prefix (valid hex - the CMS requires GUID-format keys, so a
// mnemonic "sb" prefix is rejected). Distinct from the cb… quote-card keys.
export const SPOTLIGHT_CARDS: QuoteCard[] = [
  { key: "5b000000000000000000000000000001", author: "Elena Ruiz",     text: "Mosey helped me buy my first flat at 26. The adviser broke every step down so I actually understood my mortgage - not just signed it." },
  { key: "5b000000000000000000000000000002", author: "Jamal Osei",     text: "I run a small design studio. Mosey's business account and instant invoicing mean I finally spend evenings designing instead of doing admin." },
  { key: "5b000000000000000000000000000003", author: "Fen Li",         text: "After moving countries twice, Mosey was the first bank that made cross-border transfers feel simple and transparent." },
  { key: "5b000000000000000000000000000004", author: "Grace Adeyemi",  text: "The savings goals feature nudged me into an emergency fund without thinking about it. I hit six months of expenses this year." },
  { key: "5b000000000000000000000000000005", author: "Noah Bergström",  text: "When my card was cloned abroad, the fraud team called me before I even noticed. New card waiting at my hotel the next morning." },
  { key: "5b000000000000000000000000000006", author: "Priya Nair",     text: "As a freelancer my income is lumpy. Mosey's spending insights smooth it out so I always know what's safe to spend." },
];
