/**
 * Shared FAQ content items.
 *
 * These are standalone FaqItemBlock content items referenced by BOTH the
 * homepage (seed-content.ts, via a FaqContainerBlock composition node) and the
 * FAQs page (seed-faqs.ts, via a standalone FaqContainerBlock). Editing one
 * item updates both pages.
 *
 * Keys are stable and hardcoded (not randomUUID) because the two seed scripts
 * run as separate processes and must reference the exact same content items.
 * Format: 32-char hex, no hyphens (the CMS key format).
 *
 * These items are created under the global content root (discoverGlobalRoot) so
 * they appear in the CMS "Shared Blocks → For All Applications" picker. The keys
 * use an fb9… prefix — distinct from the old fa9… items that lived under the app
 * root — so relocating them is a clean create under the new container rather than
 * a same-key recreate over a just-deleted key (which races the async delete).
 */

export interface FaqItem {
  key: string;
  displayName: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    key: "fb900000000000000000000000000001",
    displayName: "FAQ: How do I open a current account?",
    question: "How do I open a current account?",
    answer:
      "You can open a Mosey current account online in around 10 minutes. All you need is a smartphone, a valid UK address, and proof of identity. We run a soft credit check that won't affect your credit score.",
  },
  {
    key: "fb900000000000000000000000000002",
    displayName: "FAQ: What savings rates do you offer?",
    question: "What savings rates do you offer?",
    answer:
      "We currently offer an easy-access savings account at 4.6% AER and a 1-year fixed-rate account at 5.1% AER. Rates are variable on easy-access accounts and fixed for the term on fixed-rate accounts.",
  },
  {
    key: "fb900000000000000000000000000003",
    displayName: "FAQ: How does the mortgage application work?",
    question: "How does the mortgage application work?",
    answer:
      "Start by getting a decision in principle online - it takes around 10 minutes and won't affect your credit score. One of our advisors will then call you to discuss your options and guide you through the full application.",
  },
  {
    key: "fb900000000000000000000000000004",
    displayName: "FAQ: Is my money protected?",
    question: "Is my money protected?",
    answer:
      "Yes. Mosey Bank is authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority. Eligible deposits are protected by the FSCS up to £85,000 per person.",
  },
  {
    key: "fb900000000000000000000000000005",
    displayName: "FAQ: How do I switch banks to Mosey?",
    question: "How do I switch banks to Mosey?",
    answer:
      "We use the Current Account Switch Service (CASS), which moves all your direct debits and standing orders automatically within 7 working days. Your old account closes on the switch date and any payments to or from your old account are forwarded for 3 years.",
  },
  {
    key: "fb900000000000000000000000000006",
    displayName: "FAQ: What do I do if my card is lost or stolen?",
    question: "What do I do if my card is lost or stolen?",
    answer:
      "Open the Mosey app and go to Card Controls to freeze your card immediately. If you're sure it's lost or stolen, tap 'Cancel card' to order a replacement, which arrives within 3-5 working days. You can also call our 24/7 fraud line.",
  },
];
