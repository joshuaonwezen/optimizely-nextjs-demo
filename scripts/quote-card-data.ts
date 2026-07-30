// Shared QuoteBlock content items backing the homepage "Customer Voices"
// section. Referenced by BOTH seed-quote-blocks.ts (which creates the items as
// shared blocks) and seed-content.ts (which binds them into the
// CustomerVoicesBlock content area). Same pattern as scripts/faq-data.ts.
//
// Keys are stable, hardcoded 32-char hex (no hyphens) because the two seed
// scripts run as separate processes and must reference the exact same items.

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
