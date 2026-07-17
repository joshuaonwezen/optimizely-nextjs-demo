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
 * use an fb9… prefix - distinct from the old fa9… items that lived under the app
 * root - so relocating them is a clean create under the new container rather than
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

/**
 * Investments-specific FAQ items, referenced by the Investments category
 * landing page (seed-content.ts) via its own FaqContainerBlock. Distinct fb91…
 * key prefix so they never collide with the general FAQ_ITEMS (fb90…).
 */
export const INVESTMENT_FAQ_ITEMS: FaqItem[] = [
  {
    key: "fb910000000000000000000000000001",
    displayName: "FAQ: How much can I put in a Stocks & Shares ISA?",
    question: "How much can I put in a Stocks & Shares ISA?",
    answer:
      "The ISA allowance is £20,000 per tax year across all your ISAs combined. Anything you invest inside a Stocks & Shares ISA grows free of UK income tax and capital gains tax. The allowance resets every 6 April and does not carry over.",
  },
  {
    key: "fb910000000000000000000000000002",
    displayName: "FAQ: Is my capital at risk when I invest?",
    question: "Is my capital at risk when I invest?",
    answer:
      "Yes. Unlike a savings account, the value of investments can go down as well as up, and you may get back less than you put in. Investing works best over the long term - typically five years or more - which gives your money time to ride out short-term market movements.",
  },
  {
    key: "fb910000000000000000000000000003",
    displayName: "FAQ: What fees do you charge on investments?",
    question: "What fees do you charge on investments?",
    answer:
      "We charge a single annual platform fee of 0.25% of your portfolio value, capped at £250 a year. Fund management charges are set by each fund provider and are shown clearly before you invest. There are no dealing fees, no exit fees, and no charge to switch funds.",
  },
  {
    key: "fb910000000000000000000000000004",
    displayName: "FAQ: Can I withdraw my investments at any time?",
    question: "Can I withdraw my investments at any time?",
    answer:
      "Yes. There is no fixed term and no withdrawal penalty. When you sell, it usually takes three to five working days for the trade to settle and the cash to reach your Mosey current account. Remember that selling during a market dip locks in any losses.",
  },
];

/**
 * Help & Support FAQ items, referenced by the Help category landing page
 * (seed-content.ts) alongside the general FAQ_ITEMS. Distinct fb92… key prefix.
 */
export const HELP_FAQ_ITEMS: FaqItem[] = [
  {
    key: "fb920000000000000000000000000001",
    displayName: "FAQ: How do I contact Mosey support?",
    question: "How do I contact Mosey support?",
    answer:
      "The fastest way is in-app chat, where a real Mosey person answers seven days a week from 7am to 11pm. You can also call us on the number printed on the back of your card, or use the contact form and we will reply within one business day.",
  },
  {
    key: "fb920000000000000000000000000002",
    displayName: "FAQ: Do you have physical branches?",
    question: "Do you have physical branches?",
    answer:
      "We have 140 branches across the UK for the moments when you want to speak to someone face to face. Use the branch finder to see opening hours and book an appointment. Everything else can be done in the app, day or night.",
  },
  {
    key: "fb920000000000000000000000000003",
    displayName: "FAQ: How do I reset my app password or PIN?",
    question: "How do I reset my app password or PIN?",
    answer:
      "Open the Mosey app, tap 'Sign in help' on the login screen, and follow the identity checks to set a new passcode. To change your card PIN, go to Card Controls in the app and tap 'View or change PIN' - the change takes effect immediately.",
  },
  {
    key: "fb920000000000000000000000000004",
    displayName: "FAQ: How do I make a complaint?",
    question: "How do I make a complaint?",
    answer:
      "We aim to put things right first time. Raise a complaint through in-app chat or the contact form and we will acknowledge it within three working days. If we cannot resolve it within eight weeks you have the right to refer it to the Financial Ombudsman Service.",
  },
];
