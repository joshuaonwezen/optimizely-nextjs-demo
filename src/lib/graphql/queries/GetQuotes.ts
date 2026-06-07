import { graphqlFetch } from "@/lib/optimizely/client";

export interface Quote {
  author: string;
  text: string;
}

interface RawQuote {
  author?: string | null;
  text?: string | null;
}

interface GetQuotesResult {
  Quote?: {
    items?: Array<RawQuote | null> | null;
  } | null;
}

export const GET_QUOTES_QUERY = /* GraphQL */ `
  query GetQuotes {
    Quote(limit: 100, orderBy: { author: { value: ASC } }) {
      items {
        author
        text
      }
    }
  }
`;

export function toQuote(raw: RawQuote): Quote {
  return {
    author: raw.author ?? "",
    text:   raw.text   ?? "",
  };
}

export async function getQuotes(): Promise<{ items: Quote[]; fromGraph: boolean }> {
  try {
    const result = await graphqlFetch<GetQuotesResult>(
      GET_QUOTES_QUERY,
      {},
      { next: { revalidate: 60, tags: ["quotes"] } }
    );

    const raw = result.data?.Quote?.items ?? [];
    const items = raw
      .filter((q): q is RawQuote => q !== null)
      .map(toQuote)
      .filter((q) => q.author !== "");

    if (items.length === 0) return { items: DEMO_QUOTES, fromGraph: false };
    return { items, fromGraph: true };
  } catch {
    return { items: DEMO_QUOTES, fromGraph: false };
  }
}

export const DEMO_QUOTES: Quote[] = [
  { author: "Sarah Chen",    text: "I moved my savings to Mosey after seeing their 5.1% AER rate. The transfer took less than a day and the app makes it easy to watch my interest grow." },
  { author: "Marcus Webb",   text: "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer — never felt rushed." },
  { author: "Aisha Okafor",  text: "The mobile app notifications are brilliant. I know exactly where my money is going and the spending insights helped me save an extra £200 last month." },
  { author: "Tom Hartley",   text: "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically." },
  { author: "Priya Sharma",  text: "I had a fraud alert on my card at 2am. I called the number and got through to a real person in under a minute. Card blocked, new one dispatched, sorted." },
  { author: "Daniel Reeves", text: "Switched from my old bank after 12 years. Mosey's CASS switch took 7 working days and every direct debit moved without any issues whatsoever." },
];
