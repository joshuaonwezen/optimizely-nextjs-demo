import { config } from "dotenv";
import { createContent, discoverRootContainer, getManagementToken, CONTENT_ENDPOINT } from "./_shared";

config({ path: ".env.local" });

// Stable 32-hex-char keys — idempotent re-runs.
const HUB_KEY = "cc000000000000000000000000000000";

const CONSULTANTS = [
  {
    key:       "cc000000000000000000000000000001",
    name:      "Sarah Chen",
    jobTitle:  "Senior Mortgage Adviser",
    summary:   "Sarah specialises in residential mortgages for first-time buyers and those looking to remortgage. With over eight years at Mosey Bank she has helped hundreds of customers find the right deal.",
    bio:       "<p>Sarah joined Mosey Bank's mortgage team in 2017 after a decade in high-street banking. She holds the CeMAP qualification and is a registered member of the Mortgage Advice Bureau network.</p><p>Her approach is straightforward: understand your situation first, then find the product that fits - not the other way round. She works closely with Mosey's underwriting team to make sure applications are packaged correctly the first time, reducing turnaround times for customers.</p><p>Outside work Sarah volunteers with a local financial literacy programme that helps young adults understand credit and budgeting before taking on their first big financial commitment.</p>",
    expertise: ["Mortgages", "First-time buyers", "Remortgaging"],
    email:     "sarah.chen@moseybank.com",
    routeSegment: "sarah-chen",
  },
  {
    key:       "cc000000000000000000000000000002",
    name:      "Marcus Webb",
    jobTitle:  "Wealth Management Consultant",
    summary:   "Marcus works with customers at all stages of their investment journey - from opening a first ISA to planning drawdown in retirement. He brings a calm, long-term perspective to every conversation.",
    bio:       "<p>Marcus has spent 14 years in financial services, the last six of which have been with Mosey Bank's private client team. He holds the CFA Charter and is a Certified Financial Planner.</p><p>He takes a goals-based approach to wealth management, building portfolios around what customers actually want their money to do rather than benchmarking against an index for its own sake. His clients range from recently promoted professionals looking to start investing to retirees managing a drawdown pension.</p><p>Marcus is a regular speaker at Mosey's annual financial wellbeing events and writes a monthly column for the bank's customer magazine.</p>",
    expertise: ["Investments", "Pensions", "ISAs"],
    email:     "marcus.webb@moseybank.com",
    routeSegment: "marcus-webb",
  },
  {
    key:       "cc000000000000000000000000000003",
    name:      "Aisha Okafor",
    jobTitle:  "Business Banking Adviser",
    summary:   "Aisha helps SMEs and sole traders get the most from their Mosey business accounts. From day-to-day cash management to trade finance and growth funding, she knows what businesses need at every stage.",
    bio:       "<p>Aisha came to banking from a background in small business, having co-founded a logistics startup in her mid-twenties. That experience informs everything she does: she understands cash-flow pressure, the unpredictability of trade credit, and the admin burden that comes with running a growing team.</p><p>She joined Mosey Bank seven years ago and now leads the SME advisory desk for the South East region. She holds a Chartered Banker qualification and is an accredited Enterprise Finance Guarantee adviser.</p><p>Aisha is particularly focused on helping underrepresented founders access the credit and support they need to scale sustainably.</p>",
    expertise: ["Business accounts", "Trade finance", "Cash management"],
    email:     "aisha.okafor@moseybank.com",
    routeSegment: "aisha-okafor",
  },
  {
    key:       "cc000000000000000000000000000004",
    name:      "Tom Hartley",
    jobTitle:  "Investment Consultant",
    summary:   "Tom advises customers on direct market investments, ETF portfolios, and stocks and shares ISAs. His background in equity research gives him a distinctive edge in helping clients understand what they own and why.",
    bio:       "<p>Tom spent five years as an equity analyst at an investment bank before moving into client-facing advisory work. He joined Mosey Bank three years ago to build out the investment services offering for retail customers.</p><p>He believes strongly that investment decisions should be transparent and evidence-based. His sessions always start with a review of what a customer already holds - and why - before making any new recommendations.</p><p>Tom holds the Investment Management Certificate and is studying for the Chartered Institute for Securities and Investment diploma. He runs a weekly drop-in session at Mosey's City branch for customers with investment questions.</p>",
    expertise: ["Stocks and shares", "ETFs", "Portfolio management"],
    email:     "tom.hartley@moseybank.com",
    routeSegment: "tom-hartley",
  },
  {
    key:       "cc000000000000000000000000000005",
    name:      "Priya Sharma",
    jobTitle:  "Personal Finance Adviser",
    summary:   "Priya helps customers get their finances in order - whether that means building an emergency fund, paying down debt, or finding the right savings product for a specific goal.",
    bio:       "<p>Priya has been with Mosey Bank for five years, initially in the customer service team before moving into advisory. Her passion is financial inclusion: helping people who have historically avoided banks feel confident talking about their money.</p><p>She is a qualified debt adviser accredited by the Money Advice Trust and holds the Certificate in Financial Planning. She works closely with Mosey's hardship team to make sure customers in difficulty are signposted to the right support quickly.</p><p>Priya runs free budgeting workshops at community centres across the region and has been recognised by Mosey Bank with its annual customer impact award for three consecutive years.</p>",
    expertise: ["Savings", "Budgeting", "Debt management"],
    email:     "priya.sharma@moseybank.com",
    routeSegment: "priya-sharma",
  },
];

async function requestApproval(key: string, label: string): Promise<void> {
  const token = await getManagementToken();

  // Find the latest draft version for this item
  const vRes = await fetch(`${CONTENT_ENDPOINT}/${key}/versions?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!vRes.ok) throw new Error(`GET versions for ${label}: ${vRes.status} ${await vRes.text()}`);
  const vData = await vRes.json() as { items?: Array<{ version?: string; status?: string }> };
  const version = vData.items?.[0]?.version;
  if (!version) throw new Error(`No version found for ${label}`);

  // POST :ready transitions draft → ready. When an approval workflow is configured,
  // the CMS intercepts this and transitions to inReview instead, firing the workflow email.
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}:ready`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ comment: "Seeded via seed-consultants.ts - ready for review and publish." }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`requestApproval ${label}: ${res.status} ${body.slice(0, 300)}`);
  }
  console.log(`  [submitted for approval] ${label}`);
}

async function main() {
  console.log("=== seed-consultants.ts ===\n");

  const rootContainer = await discoverRootContainer();

  // Part 1 - hub page
  console.log("--- Part 1: Consultants hub page ---");
  await createContent(
    {
      key:          HUB_KEY,
      contentType:  "TraditionalPage",
      container:    rootContainer,
      locale:       "en",
      displayName:  "Consultants",
      routeSegment: "consultants",
      properties: {
        heading:    "Our Consultants",
        subheading: "Expert advice from people who listen.",
      },
    },
    "Consultants hub",
  );

  // Part 2 - consultant profile pages
  console.log("\n--- Part 2: Consultant profile pages ---");
  for (const c of CONSULTANTS) {
    await createContent(
      {
        key:          c.key,
        contentType:  "ConsultantPage",
        container:    HUB_KEY,
        locale:       "en",
        displayName:  c.name,
        routeSegment: c.routeSegment,
        properties: {
          name:      c.name,
          jobTitle:  c.jobTitle,
          summary:   c.summary,
          bio:       { html: c.bio },
          expertise: c.expertise,
          email:     c.email,
        },
      },
      c.name,
    );
  }

  // Part 3 - draft consultant profiles (pending approval workflow)
  console.log("\n--- Part 3: Draft consultant profiles (awaiting approval) ---");
  const DRAFT_CONSULTANTS = [
    {
      key:          "cc000000000000000000000000000006",
      name:         "James Obi",
      jobTitle:     "Commercial Lending Adviser",
      summary:      "James advises businesses on commercial loans, property finance, and working capital facilities. He has a particular focus on the healthcare and professional services sectors.",
      bio:          "<p>James spent eight years at a specialist commercial lender before joining Mosey Bank, where he now heads up the commercial lending advisory desk for London and the South East.</p><p>He holds the Chartered Banker qualification and an MSc in Finance from the University of Exeter. His sector focus on healthcare and professional services reflects the growing share of Mosey's commercial loan book in those industries.</p>",
      expertise:    ["Commercial loans", "Property finance", "Working capital"],
      email:        "james.obi@moseybank.com",
      routeSegment: "james-obi",
    },
    {
      key:          "cc000000000000000000000000000007",
      name:         "Natalie Ford",
      jobTitle:     "Retirement Planning Specialist",
      summary:      "Natalie helps customers approaching retirement make informed decisions about their pension, annuities, and drawdown options. She is one of only a handful of advisers at Mosey with the Pension Transfer Gold Standard accreditation.",
      bio:          "<p>Natalie has worked in financial services for 16 years, the last nine of which have been focused exclusively on retirement planning. She joined Mosey Bank after a period at a boutique IFA firm and holds both the CII Diploma in Regulated Financial Planning and the AF7 Pension Transfers qualification.</p><p>She works with customers from their mid-50s onwards, helping them model different retirement scenarios and stress-test their plans against longevity and inflation risk.</p>",
      expertise:    ["Pensions", "Drawdown", "Annuities"],
      email:        "natalie.ford@moseybank.com",
      routeSegment: "natalie-ford",
    },
    {
      key:          "cc000000000000000000000000000008",
      name:         "Daniel Reeves",
      jobTitle:     "Foreign Exchange Adviser",
      summary:      "Daniel advises individuals and businesses on international money transfers, currency hedging, and FX risk management. He covers over 30 currencies and works with customers making regular or large one-off transfers.",
      bio:          "<p>Daniel joined Mosey Bank's international payments team six years ago from a specialist FX broker. He holds the ACI Dealing Certificate and has experience structuring forward contracts and vanilla options for SME clients with regular overseas payroll or supplier payments.</p><p>For personal customers he focuses on large one-off transfers - property purchases abroad, emigration, inheritance - where timing and rate transparency matter most.</p>",
      expertise:    ["Foreign exchange", "Currency hedging", "International transfers"],
      email:        "daniel.reeves@moseybank.com",
      routeSegment: "daniel-reeves",
    },
    {
      key:          "cc000000000000000000000000000009",
      name:         "Chloe Nguyen",
      jobTitle:     "Protection Adviser",
      summary:      "Chloe specialises in life insurance, critical illness cover, and income protection. She helps customers make sure their finances are resilient to the unexpected - without overpaying for cover they do not need.",
      bio:          "<p>Chloe started her career as a protection underwriter, which gives her a detailed understanding of how insurers assess risk and price policies. She moved into advisory work five years ago and joined Mosey Bank's protection team shortly after.</p><p>She holds the CII Certificate in Insurance and the Level 4 Diploma in Financial Planning. Her approach is to start with what customers are actually afraid of losing - income, the family home, a business - and work back from there.</p>",
      expertise:    ["Life insurance", "Critical illness", "Income protection"],
      email:        "chloe.nguyen@moseybank.com",
      routeSegment: "chloe-nguyen",
    },
    {
      key:          "cc000000000000000000000000000010",
      name:         "Kwame Asante",
      jobTitle:     "Sustainable Finance Adviser",
      summary:      "Kwame works with customers who want their money to reflect their values - from ESG investment portfolios to green mortgages and sustainable business finance.",
      bio:          "<p>Kwame joined Mosey Bank two years ago to build out the sustainable finance advisory practice, which has grown rapidly as customer demand for ethical and ESG-aligned products has increased.</p><p>He holds the CFA Institute Certificate in ESG Investing and a background in environmental policy, having worked for a sustainability consultancy before moving into finance. He advises both personal and business customers and publishes a quarterly briefing on sustainable finance trends for Mosey's website.</p>",
      expertise:    ["ESG investing", "Green mortgages", "Sustainable business finance"],
      email:        "kwame.asante@moseybank.com",
      routeSegment: "kwame-asante",
    },
    {
      key:          "cc000000000000000000000000000011",
      name:         "Rina Patel",
      jobTitle:     "Student and Graduate Finance Adviser",
      summary:      "Rina helps students, recent graduates, and early-career professionals build strong financial foundations - from student accounts and graduate overdrafts to first savings plans and credit building.",
      bio:          "<p>Rina joined Mosey Bank's young customer team three years ago after a role at a student-focused fintech. She is passionate about reaching people before they develop financial habits that are hard to change, and runs a popular monthly webinar series called 'Money After University'.</p><p>She holds the Certificate in Financial Planning and is trained in financial coaching techniques. Her sessions are deliberately jargon-free and she is one of the highest-rated advisers on Mosey's internal customer satisfaction surveys.</p>",
      expertise:    ["Student accounts", "Graduate finance", "Credit building"],
      email:        "rina.patel@moseybank.com",
      routeSegment: "rina-patel",
    },
  ];

  for (const c of DRAFT_CONSULTANTS) {
    await createContent(
      {
        key:          c.key,
        contentType:  "ConsultantPage",
        container:    HUB_KEY,
        locale:       "en",
        displayName:  c.name,
        routeSegment: c.routeSegment,
        properties: {
          name:      c.name,
          jobTitle:  c.jobTitle,
          summary:   c.summary,
          bio:       { html: c.bio },
          expertise: c.expertise,
          email:     c.email,
        },
      },
      c.name,
      { skipPublish: true },
    );
  }

  // Part 4 - published consultant profiles
  console.log("\n--- Part 4: Published consultant profiles ---");
  const PUBLISHED_CONSULTANTS_2 = [
    {
      key:          "cc000000000000000000000000000012",
      name:         "Oliver Grant",
      jobTitle:     "Private Banking Adviser",
      summary:      "Oliver works with high-net-worth customers on complex financial planning needs - from estate structuring and trust advice to bespoke lending and concierge banking.",
      bio:          "<p>Oliver has spent 20 years in private banking, the last decade at Mosey Bank's private client division. He holds the STEP Foundation Certificate in Trusts and Estates and the Level 6 Diploma in Financial Planning.</p><p>He works with a small book of long-term clients, many of whom have been with him since his early career. His strength is in simplifying complexity - taking an intricate picture of assets, liabilities, and family objectives and turning it into a coherent plan that evolves over time.</p>",
      expertise:    ["Private banking", "Estate planning", "Bespoke lending"],
      email:        "oliver.grant@moseybank.com",
      routeSegment: "oliver-grant",
    },
    {
      key:          "cc000000000000000000000000000013",
      name:         "Fatima Hassan",
      jobTitle:     "Islamic Finance Adviser",
      summary:      "Fatima specialises in Sharia-compliant financial products including home purchase plans, ethical savings accounts, and halal investment portfolios.",
      bio:          "<p>Fatima is one of a small number of advisers in the UK with deep expertise across both conventional finance and Islamic finance principles. She holds the IFQ (Islamic Finance Qualification) alongside the CII Diploma in Regulated Financial Planning.</p><p>She joined Mosey Bank four years ago to establish and grow the Islamic finance advisory service, which now covers home finance, savings, and investments. She works closely with Mosey's product team and its Sharia supervisory board to ensure all products meet the necessary standards.</p>",
      expertise:    ["Islamic finance", "Halal investments", "Home purchase plans"],
      email:        "fatima.hassan@moseybank.com",
      routeSegment: "fatima-hassan",
    },
    {
      key:          "cc000000000000000000000000000014",
      name:         "Ben Marsh",
      jobTitle:     "Agricultural Finance Adviser",
      summary:      "Ben advises farming businesses and rural estates on land finance, seasonal working capital, diversification funding, and agricultural insurance.",
      bio:          "<p>Ben grew up on a mixed arable and livestock farm in Lincolnshire, which gives him an authentic understanding of the financial pressures and cycles that rural businesses face. He joined Mosey Bank's agricultural team nine years ago after a period at a rural surveying practice.</p><p>He holds the Rural Finance qualification from the Agricultural Mortgage Corporation and covers clients across the East Midlands and Yorkshire. He is a regular exhibitor at the Royal Show and Cereals event, where he runs financial planning clinics for farming families.</p>",
      expertise:    ["Agricultural loans", "Rural finance", "Seasonal lending"],
      email:        "ben.marsh@moseybank.com",
      routeSegment: "ben-marsh",
    },
    {
      key:          "cc000000000000000000000000000015",
      name:         "Lucia Romano",
      jobTitle:     "Expat Banking Adviser",
      summary:      "Lucia helps UK nationals living abroad and foreign nationals moving to the UK manage the financial complexity of living across two tax and banking jurisdictions.",
      bio:          "<p>Lucia spent seven years working in international banking in Singapore and Dubai before returning to the UK. That firsthand experience of managing finances across borders informs every conversation she has with expat clients.</p><p>She holds the STEP Foundation Certificate in International Asset and Wealth Management and the CII Diploma in Financial Planning. Her clients include UK nationals working abroad who want to maintain a UK banking relationship, and inbound expats who need to establish credit history and financial infrastructure quickly.</p>",
      expertise:    ["Expat accounts", "Cross-border finance", "International tax"],
      email:        "lucia.romano@moseybank.com",
      routeSegment: "lucia-romano",
    },
    {
      key:          "cc000000000000000000000000000016",
      name:         "Aaron Clarke",
      jobTitle:     "Start-up Finance Adviser",
      summary:      "Aaron works with founders and early-stage businesses on banking, funding strategy, and financial planning. He has helped over 80 start-ups open their first business account and access growth capital.",
      bio:          "<p>Aaron founded and sold a SaaS business before moving into banking, and that experience shapes everything he does. He understands cap tables, runway, and the funding journey from pre-seed through Series A - and he uses that knowledge to give founders context they rarely get from a bank.</p><p>He joined Mosey Bank three years ago to build the start-up banking proposition and holds the Enterprise Finance Guarantee accreditation alongside the Chartered Banker qualification. He is a mentor at two London-based accelerators.</p>",
      expertise:    ["Start-up banking", "Growth funding", "Founder finance"],
      email:        "aaron.clarke@moseybank.com",
      routeSegment: "aaron-clarke",
    },
    {
      key:          "cc000000000000000000000000000017",
      name:         "Grace Kim",
      jobTitle:     "Divorce Finance Specialist",
      summary:      "Grace helps individuals going through separation or divorce understand their financial options and plan for financial independence. She works alongside family solicitors to provide joined-up advice.",
      bio:          "<p>Grace trained as a financial planner before specialising in the financial aspects of divorce and separation, a relatively niche but growing area of advice. She holds the Resolution accreditation for collaborative financial practice and the CII Diploma in Financial Planning.</p><p>She works closely with family law firms in the South East, appearing as a financial neutral in mediation processes and providing pension on divorce reports. Her goal is to help clients reach fair, durable outcomes quickly - reducing both cost and emotional strain.</p>",
      expertise:    ["Divorce finance", "Pension sharing", "Financial independence"],
      email:        "grace.kim@moseybank.com",
      routeSegment: "grace-kim",
    },
  ];

  for (const c of PUBLISHED_CONSULTANTS_2) {
    // Create as draft (skipPublish) — approval workflow blocks direct publishing
    await createContent(
      {
        key:          c.key,
        contentType:  "ConsultantPage",
        container:    HUB_KEY,
        locale:       "en",
        displayName:  c.name,
        routeSegment: c.routeSegment,
        properties: {
          name:      c.name,
          jobTitle:  c.jobTitle,
          summary:   c.summary,
          bio:       { html: c.bio },
          expertise: c.expertise,
          email:     c.email,
        },
      },
      c.name,
      { skipPublish: true },
    );
    // Submit for approval — triggers the CMS workflow and sends the notification email
    await requestApproval(c.key, c.name);
  }

  console.log("\n=== Done ===");
  console.log(`\nConsultant pages seeded under /en/consultants/`);
  console.log("Wait ~60s for Graph to index, then visit /en/consultants/sarah-chen\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
