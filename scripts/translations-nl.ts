/**
 * English → Dutch dictionary for seed-localization.ts.
 *
 * Keys are the EXACT English strings written by the seed scripts
 * (seed-content, seed-nav, seed-faqs). The localization seeder walks every
 * fetched EN version and replaces string values that match a key here -
 * anything not in this map (URLs, icons, type keys, stat values) is left
 * untouched, so a lookup miss is always safe.
 *
 * When a seed script changes copy, add the new string here - the seeder
 * warns about prose-looking strings it could not translate.
 */

export const NL: Record<string, string> = {
  // Category pages (buildCategoryPage headings + subheadings)
  "Personal Banking": "Particulier bankieren",
  "Current accounts, savings, and mortgages designed around your everyday needs.":
    "Betaalrekeningen, spaarrekeningen en hypotheken, ontworpen rond jouw dagelijkse behoeften.",
  "Business Banking": "Zakelijk bankieren",
  "Current accounts, lending, and payment solutions for UK businesses of every size.":
    "Betaalrekeningen, kredieten en betaaloplossingen voor Britse bedrijven van elke omvang.",
  "Investments": "Beleggen",
  "Stocks & Shares ISAs, pensions, and long-term savings products.":
    "Beleggings-ISA's, pensioenen en spaarproducten voor de lange termijn.",
  "Help & Support": "Hulp & ondersteuning",
  "FAQs, contact us, and branch finder — we're here when you need us.":
    "Veelgestelde vragen, contact en filialen — we zijn er wanneer je ons nodig hebt.",
  "About Mosey Bank": "Over Mosey Bank",
  "Our story, values, team, careers, and press.":
    "Ons verhaal, onze waarden, ons team, vacatures en pers.",

  // Homepage
  "Banking built around you": "Bankieren dat om jou draait",
  "Straightforward current accounts, competitive savings rates, and mortgages that move at your pace.":
    "Heldere betaalrekeningen, scherpe spaarrentes en hypotheken in jouw tempo.",
  "Our products": "Onze producten",
  "Everything you need to manage your money, save for the future, and plan for what's next.":
    "Alles wat je nodig hebt om je geld te beheren, te sparen voor de toekomst en vooruit te plannen.",
  "Current Account": "Betaalrekening",
  "A fee-free everyday account with instant payment notifications and no hidden charges.":
    "Een gratis betaalrekening voor elke dag, met directe meldingen en zonder verborgen kosten.",
  "Open an account →": "Open een rekening →",
  "Savings": "Sparen",
  "Easy-access and fixed-rate savings accounts with rates up to 5.1% AER. Your money working harder.":
    "Direct opneembare en vaste spaarrekeningen met rentes tot 5,1% AER. Je geld werkt harder.",
  "View savings rates →": "Bekijk spaarrentes →",
  "Mortgage": "Hypotheek",
  "Find your rate in minutes. Our advisors guide you from application to completion.":
    "Vind je rente in enkele minuten. Onze adviseurs begeleiden je van aanvraag tot afronding.",
  "Get a mortgage →": "Sluit een hypotheek af →",
  "Current accounts, lending, and card payment solutions for UK businesses of every size.":
    "Betaalrekeningen, kredieten en pinoplossingen voor Britse bedrijven van elke omvang.",
  "Open a business account →": "Open een zakelijke rekening →",
  "Mosey made getting my mortgage so simple. The whole process was online and I had an offer within 48 hours. I couldn't believe how painless it was.":
    "Mosey maakte mijn hypotheek zó eenvoudig. Het hele proces verliep online en ik had binnen 48 uur een offerte. Ik kon niet geloven hoe pijnloos het was.",
  "Homeowner, Leeds": "Huiseigenaar, Leeds",
  "Trusted by 2 million customers across the UK": "Vertrouwd door 2 miljoen klanten in het hele VK",
  "From first current accounts to business banking — Mosey customers bank with confidence.":
    "Van een eerste betaalrekening tot zakelijk bankieren — Mosey-klanten bankieren met vertrouwen.",
  "Customers": "Klanten",
  "Assets under management": "Beheerd vermogen",
  "App uptime": "App-uptime",
  "UK branches": "Filialen in het VK",
  "Our best rate": "Onze beste rente",
  "Our fixed-rate savings account now offers 5.1% AER. Lock in your rate today and watch your money grow — FSCS protected up to £85,000.":
    "Onze spaarrekening met vaste rente biedt nu 5,1% AER. Leg je rente vandaag vast en zie je geld groeien — FSCS-beschermd tot £85.000.",
  "See savings rates": "Bekijk spaarrentes",
  "Frequently asked questions": "Veelgestelde vragen",
  "Quick answers to the things we hear most.": "Snelle antwoorden op de vragen die we het vaakst horen.",
  "Open an account today": "Open vandaag een rekening",

  // Shared product page strings
  "Key features": "Belangrijkste kenmerken",

  // Mortgage page
  "Home Buying": "Een huis kopen",
  "Find your mortgage rate in minutes. Our advisors guide you from first click to key handover.":
    "Vind je hypotheekrente in enkele minuten. Onze adviseurs begeleiden je van eerste klik tot sleuteloverdracht.",
  "Get a Mortgage": "Sluit een hypotheek af",
  "What makes Mortgage work for you.": "Waarom onze hypotheek bij je past.",
  "Decision in principle online": "Online voorlopig hypotheekakkoord",
  "Get a DIP in 10 minutes without affecting your credit score. Know your budget before you start house hunting.":
    "Ontvang binnen 10 minuten een voorlopig akkoord zonder invloed op je kredietscore. Ken je budget voordat je gaat huizen kijken.",
  "Dedicated mortgage advisor": "Persoonlijke hypotheekadviseur",
  "A real person calls you after your DIP to talk through your options, answer questions, and guide you through the full application.":
    "Een echt mens belt je na je voorlopig akkoord om je opties door te nemen, vragen te beantwoorden en je door de volledige aanvraag te begeleiden.",
  "Fixed and tracker rates": "Vaste en variabele rentes",
  "Choose the certainty of a 2 or 5 year fixed rate, or take advantage of falling rates with a tracker mortgage.":
    "Kies de zekerheid van een vaste rente voor 2 of 5 jaar, of profiteer van dalende rentes met een variabele hypotheek.",
  "No arrangement fee options": "Opties zonder afsluitkosten",
  "Pick a mortgage with no upfront arrangement fee — ideal if you want to keep costs down when buying.":
    "Kies een hypotheek zonder afsluitkosten vooraf — ideaal als je de kosten bij aankoop laag wilt houden.",
  "Buying a home is the biggest financial decision most people make. Mosey's mortgage team is here to make it as straightforward as possible — from the first online check to the day you get your keys.":
    "Een huis kopen is voor de meeste mensen de grootste financiële beslissing. Het hypotheekteam van Mosey maakt het zo eenvoudig mogelijk — van de eerste online check tot de dag dat je de sleutels krijgt.",
  "Get Started": "Aan de slag",
  "Applied for a mortgage online on a Sunday. Had a decision in principle by Monday morning. The advisor called to walk me through the full offer — never felt rushed.":
    "Op zondag online een hypotheek aangevraagd. Maandagochtend had ik een voorlopig akkoord. De adviseur belde om de offerte door te nemen — ik voelde me nooit opgejaagd.",
  "First-time buyer, Bristol": "Starter, Bristol",
  "Important": "Belangrijk",
  "Your home may be repossessed if you do not keep up repayments on your mortgage. Make sure you can afford the repayments before you apply.":
    "Je huis kan worden verkocht als je de aflossingen van je hypotheek niet nakomt. Zorg dat je de maandlasten kunt dragen voordat je een aanvraag doet.",

  // Current Account page
  "A fee-free everyday account with instant notifications, smart budgeting tools, and no hidden charges.":
    "Een gratis betaalrekening voor elke dag, met directe meldingen, slimme budgettools en zonder verborgen kosten.",
  "Open an Account": "Open een rekening",
  "What makes Current Account work for you.": "Waarom onze betaalrekening bij je past.",
  "No monthly fees": "Geen maandelijkse kosten",
  "Keep more of your money. Our current account has no monthly maintenance fee, no minimum balance, and no charge for standard transfers.":
    "Houd meer van je geld over. Onze betaalrekening heeft geen maandelijkse kosten, geen minimumsaldo en geen kosten voor standaardoverboekingen.",
  "Instant notifications": "Directe meldingen",
  "Get a push notification the moment money moves in or out of your account. Know your balance in real time, always.":
    "Ontvang een pushmelding zodra er geld je rekening in of uit gaat. Ken je saldo altijd realtime.",
  "Contactless & Apple/Google Pay": "Contactloos & Apple/Google Pay",
  "Pay with your card or phone anywhere in the world. Freeze and unfreeze your card instantly from the app if it goes missing.":
    "Betaal overal ter wereld met je pas of telefoon. Blokkeer en deblokkeer je pas direct vanuit de app als je hem kwijtraakt.",
  "Smart spending insights": "Slim inzicht in je uitgaven",
  "See exactly where your money goes each month, automatically categorised. Set spending limits and watch your savings grow.":
    "Zie precies waar je geld elke maand naartoe gaat, automatisch gecategoriseerd. Stel bestedingslimieten in en zie je spaargeld groeien.",
  "The Mosey current account is designed for modern life. Open in 10 minutes with just your phone and a valid ID — no branch visit required. Manage everything from the app: move money, set up direct debits, pay bills, and speak to a real person via in-app chat seven days a week.":
    "De Mosey-betaalrekening is ontworpen voor het moderne leven. Open hem in 10 minuten met alleen je telefoon en een geldig ID — geen filiaalbezoek nodig. Regel alles vanuit de app: geld overmaken, incasso's instellen, rekeningen betalen en zeven dagen per week chatten met een echt mens.",

  // Savings page
  "Save Smarter": "Slimmer sparen",
  "Easy-access and fixed-rate savings accounts with market-leading rates. FSCS protected up to £85,000.":
    "Direct opneembare en vaste spaarrekeningen met toonaangevende rentes. FSCS-beschermd tot £85.000.",
  "View Savings Rates": "Bekijk spaarrentes",
  "What makes Savings work for you.": "Waarom sparen bij Mosey bij je past.",
  "Easy-access at 4.6% AER": "Direct opneembaar tegen 4,6% AER",
  "Withdraw whenever you need to with no penalty. Your rate is competitive and reviewed monthly to stay near the top of the market.":
    "Neem op wanneer je wilt, zonder boete. Je rente is scherp en wordt maandelijks herzien om bij de top van de markt te blijven.",
  "1-year fixed rate at 5.1% AER": "1 jaar vaste rente tegen 5,1% AER",
  "Lock in our best rate for 12 months and know exactly what you'll earn. Minimum deposit £500, maximum £250,000.":
    "Leg onze beste rente 12 maanden vast en weet precies wat je verdient. Minimale inleg £500, maximaal £250.000.",
  "FSCS protected": "FSCS-beschermd",
  "Every penny you save with Mosey is protected by the Financial Services Compensation Scheme up to £85,000 per person.":
    "Elke cent die je bij Mosey spaart is beschermd door het Financial Services Compensation Scheme, tot £85.000 per persoon.",
  "Open in minutes": "In enkele minuten geopend",
  "Link any UK current account. Transfer funds instantly and start earning interest from the next business day.":
    "Koppel elke Britse betaalrekening. Maak direct geld over en ontvang al vanaf de volgende werkdag rente.",
  "Whether you're building an emergency fund, saving for a home, or making idle cash work harder, Mosey savings accounts give you competitive rates without the complexity.":
    "Of je nu een buffer opbouwt, spaart voor een huis of stilstaand geld harder wilt laten werken: de spaarrekeningen van Mosey geven je scherpe rentes zonder gedoe.",
  "Open a Savings Account": "Open een spaarrekening",
  "AER fixed rate": "AER vaste rente",
  "AER easy access": "AER direct opneembaar",
  "FSCS protection per person": "FSCS-bescherming per persoon",
  "To open an account": "Om een rekening te openen",
  "I moved my savings to Mosey after seeing the 5.1% fixed rate. The transfer took less than a day and the app makes it easy to watch my interest grow.":
    "Ik heb mijn spaargeld naar Mosey verhuisd na het zien van de vaste rente van 5,1%. De overstap duurde minder dan een dag en in de app zie ik mijn rente eenvoudig groeien.",
  "Mosey customer": "Mosey-klant",

  // Business Banking page
  "Business": "Zakelijk",
  "Current accounts, lending, and payment solutions built for UK businesses. Open in 15 minutes.":
    "Betaalrekeningen, kredieten en betaaloplossingen voor Britse bedrijven. Geopend in 15 minuten.",
  "Open a Business Account": "Open een zakelijke rekening",
  "What makes Business Banking work for you.": "Waarom zakelijk bankieren bij Mosey bij je past.",
  "Fee-free business current account": "Gratis zakelijke betaalrekening",
  "No monthly fee for the first 12 months. After that, £7 per month with unlimited transactions included.":
    "Geen maandelijkse kosten in de eerste 12 maanden. Daarna £7 per maand, inclusief onbeperkte transacties.",
  "Accounting integrations": "Boekhoudkoppelingen",
  "Connect to Xero, QuickBooks, and FreeAgent in one click. Transactions sync automatically so your books are always up to date.":
    "Koppel met één klik aan Xero, QuickBooks en FreeAgent. Transacties synchroniseren automatisch, zodat je boekhouding altijd actueel is.",
  "Instant invoicing": "Direct factureren",
  "Create and send professional invoices from the app and get notified the moment they're paid.":
    "Maak en verstuur professionele facturen vanuit de app en krijg een melding zodra ze zijn betaald.",
  "Business lending": "Zakelijke kredieten",
  "Flexible loans from £10,000 to £500,000 and overdraft facilities to smooth out cash flow. Decisions in 48 hours.":
    "Flexibele leningen van £10.000 tot £500.000 en kredietfaciliteiten om je cashflow te stabiliseren. Beslissing binnen 48 uur.",
  "Mosey Business Banking is designed for the way modern businesses actually work — online, mobile-first, and integrated with the tools you already use.":
    "Mosey Zakelijk is ontworpen voor hoe moderne bedrijven écht werken — online, mobile-first en geïntegreerd met de tools die je al gebruikt.",
  "Opened a business current account in under 15 minutes. The integration with our accounting software was seamless — invoices reconcile automatically.":
    "In minder dan 15 minuten een zakelijke betaalrekening geopend. De koppeling met onze boekhoudsoftware was naadloos — facturen worden automatisch afgeletterd.",
  "Director, Hartley & Co.": "Directeur, Hartley & Co.",

  // Contact page
  "Get in touch": "Neem contact op",
  "Have a question or need help with your account? Fill out the form and we'll get back to you within one business day.":
    "Heb je een vraag of hulp nodig met je rekening? Vul het formulier in en we reageren binnen één werkdag.",

  // ContactFormBlock (seed-contact-pages.ts)
  "Send us a message": "Stuur ons een bericht",
  "Send message": "Bericht versturen",
  "Thank you! We'll be in touch within one business day.":
    "Bedankt! We nemen binnen één werkdag contact met je op.",

  // BranchFinderBlock (seed-branch-finder.ts)
  "Find your nearest branch": "Vind je dichtstbijzijnde kantoor",
  "Enter a city or address to see the closest Mosey branches, their opening services, and how far away they are.":
    "Voer een stad of adres in om de dichtstbijzijnde Mosey-kantoren te zien, welke diensten ze bieden en hoe ver ze bij je vandaan zijn.",
  "City or address, e.g. Berlin": "Stad of adres, bijv. Amsterdam",
  "Search": "Zoeken",

  // First-Time Buyers page
  "First Home": "Eerste woning",
  "First-Time Buyers": "Starters",
  "Getting on the ladder is a big deal. We make the mortgage part as simple as possible.":
    "Je eerste woning kopen is een grote stap. Wij maken het hypotheekgedeelte zo eenvoudig mogelijk.",
  "Get a Decision in Principle": "Vraag een voorlopig akkoord aan",
  "What makes First-Time Buyers work for you.": "Waarom onze startershypotheek bij je past.",
  "5% deposit mortgages": "Hypotheken met 5% eigen inbreng",
  "We offer mortgages with as little as a 5% deposit for first-time buyers purchasing their primary residence.":
    "We bieden hypotheken met slechts 5% eigen inbreng voor starters die hun eerste eigen woning kopen.",
  "Government scheme support": "Hulp bij overheidsregelingen",
  "Our advisors are experts in Help to Buy, Shared Ownership, and the Lifetime ISA. We'll help you use every available scheme.":
    "Onze adviseurs zijn expert in Help to Buy, Shared Ownership en de Lifetime ISA. We helpen je elke beschikbare regeling te benutten.",
  "No arrangement fee": "Geen afsluitkosten",
  "Choose a mortgage with no upfront arrangement fee — keeping your costs down when every pound counts.":
    "Kies een hypotheek zonder afsluitkosten vooraf — zo houd je de kosten laag wanneer elke pond telt.",
  "Step-by-step guidance": "Stap-voor-stap begeleiding",
  "From offer accepted to keys in hand, your dedicated advisor walks you through every stage of the process.":
    "Van geaccepteerd bod tot sleutels in de hand: je persoonlijke adviseur loodst je door elke fase van het proces.",
  "Buying your first home is one of life's biggest milestones. Mosey's first-time buyer mortgages and specialist advisors are here to take the mystery out of the process.":
    "Je eerste huis kopen is een van de grootste mijlpalen in je leven. De startershypotheken en gespecialiseerde adviseurs van Mosey halen het mysterie uit het proces.",

  // Remortgaging page
  "Better Rate": "Betere rente",
  "Remortgaging": "Oversluiten",
  "Switch to a better deal when your fixed term ends. We do the heavy lifting so you don't have to.":
    "Stap over naar een betere deal wanneer je rentevaste periode afloopt. Wij doen het zware werk, zodat jij het niet hoeft te doen.",
  "Check My Remortgage Rate": "Check mijn oversluitrente",
  "What makes Remortgaging work for you.": "Waarom oversluiten via Mosey bij je past.",
  "Rate alert before your term ends": "Renteseintje vóór je periode afloopt",
  "We'll contact you 3 months before your fixed rate expires so you have plenty of time to find a better deal.":
    "We nemen 3 maanden voordat je vaste rente afloopt contact op, zodat je ruim de tijd hebt om een betere deal te vinden.",
  "Free legal work for switchers": "Gratis juridische afhandeling voor overstappers",
  "Switch to Mosey and we cover the legal costs of the remortgage. No hidden charges.":
    "Stap over naar Mosey en wij dekken de juridische kosten van het oversluiten. Geen verborgen kosten.",
  "Like-for-like switching": "Één-op-één overstappen",
  "Already with us? Switch to a new deal in minutes with no new affordability assessment required in most cases.":
    "Al klant bij ons? Stap in enkele minuten over naar een nieuwe deal, in de meeste gevallen zonder nieuwe inkomenstoets.",
  "Borrow more if needed": "Leen bij als het nodig is",
  "A remortgage is also a chance to release equity for home improvements or consolidate existing debt at a lower rate.":
    "Oversluiten is ook een kans om overwaarde vrij te maken voor een verbouwing of bestaande schulden samen te voegen tegen een lagere rente.",
  "When your current deal ends, your mortgage typically reverts to a standard variable rate. Remortgaging to a new fixed rate with Mosey can save hundreds of pounds a year.":
    "Wanneer je huidige deal afloopt, valt je hypotheek meestal terug op een standaard variabele rente. Oversluiten naar een nieuwe vaste rente bij Mosey kan honderden ponden per jaar schelen.",
  "Check My Rate": "Check mijn rente",

  // Instant Payments page
  "Faster Payments": "Snellere betalingen",
  "Instant Payments": "Directe betalingen",
  "Send and receive money in seconds, 24 hours a day, 365 days a year. No delays, no cut-off times.":
    "Verstuur en ontvang geld binnen seconden, 24 uur per dag, 365 dagen per jaar. Geen vertragingen, geen sluitingstijden.",
  "What makes Instant Payments work for you.": "Waarom directe betalingen bij je passen.",
  "Send money to any UK bank account in seconds via the Faster Payments network. Available around the clock.":
    "Stuur binnen seconden geld naar elke Britse bankrekening via het Faster Payments-netwerk. Dag en nacht beschikbaar.",
  "Standing orders": "Periodieke overboekingen",
  "Set up regular payments on any schedule — weekly, monthly, or on a custom date — and manage them entirely in the app.":
    "Stel terugkerende betalingen in op elk schema — wekelijks, maandelijks of op een eigen datum — en beheer ze volledig in de app.",
  "Direct debits": "Incasso's",
  "Authorise and cancel direct debits in the app. See what's due before it leaves your account.":
    "Machtig en annuleer incasso's in de app. Zie wat eraan komt voordat het van je rekening gaat.",
  "International transfers": "Internationale overboekingen",
  "Send money abroad with real exchange rates and low fees. Track your transfer every step of the way.":
    "Stuur geld naar het buitenland tegen echte wisselkoersen en lage kosten. Volg je overboeking bij elke stap.",
  "Modern banking means money moves at your speed — not the bank's. Mosey uses the UK Faster Payments network so transfers reach their destination in seconds, not hours.":
    "Modern bankieren betekent dat geld beweegt op jouw snelheid — niet die van de bank. Mosey gebruikt het Britse Faster Payments-netwerk, zodat overboekingen binnen seconden aankomen, niet binnen uren.",

  // Mobile App page
  "Banking on the Go": "Bankieren onderweg",
  "Mobile App": "Mobiele app",
  "Everything your bank account can do, from your pocket. Rated 4.8 stars on the App Store.":
    "Alles wat je bankrekening kan, vanuit je broekzak. Beoordeeld met 4,8 sterren in de App Store.",
  "Download the App": "Download de app",
  "What makes Mobile App work for you.": "Waarom onze app bij je past.",
  "Instant balance & transactions": "Direct saldo & transacties",
  "See your real-time balance and every transaction the moment it happens. No delays, no end-of-day batch updates.":
    "Zie je realtime saldo en elke transactie op het moment dat die plaatsvindt. Geen vertraging, geen batchverwerking aan het einde van de dag.",
  "Card controls": "Pasbeheer",
  "Freeze, unfreeze, or cancel your card in one tap. Set limits on contactless payments, online spending, and withdrawals.":
    "Blokkeer, deblokkeer of annuleer je pas met één tik. Stel limieten in voor contactloos betalen, online uitgaven en opnames.",
  "Spending insights": "Inzicht in uitgaven",
  "Transactions are automatically categorised so you can see where your money goes each month. Set budgets and track progress.":
    "Transacties worden automatisch gecategoriseerd, zodat je ziet waar je geld elke maand naartoe gaat. Stel budgetten in en volg je voortgang.",
  "In-app chat support": "Chatondersteuning in de app",
  "Talk to a real Mosey person via in-app chat seven days a week. No hold music, no call centres.":
    "Chat zeven dagen per week met een echt mens van Mosey in de app. Geen wachtmuziek, geen callcenters.",
  "The Mosey app is how most of our customers do their banking. It's fast, intuitive, and packed with features that used to require a branch visit. Rated 4.8 stars on the App Store and 4.7 on Google Play.":
    "De Mosey-app is hoe de meeste van onze klanten bankieren. Snel, intuïtief en boordevol functies waarvoor je vroeger naar een filiaal moest. Beoordeeld met 4,8 sterren in de App Store en 4,7 op Google Play.",

  // Travel Money page
  "Travel": "Reizen",
  "Travel Money": "Geld op reis",
  "Spend abroad with no foreign transaction fees and real exchange rates. Your card works in 200+ countries.":
    "Betaal in het buitenland zonder transactiekosten en tegen echte wisselkoersen. Je pas werkt in 200+ landen.",
  "What makes Travel Money work for you.": "Waarom betalen op reis met Mosey bij je past.",
  "No foreign transaction fees": "Geen buitenlandse transactiekosten",
  "Use your Mosey card anywhere in the world and we'll never add a foreign transaction or currency conversion fee.":
    "Gebruik je Mosey-pas overal ter wereld; wij rekenen nooit transactie- of omrekenkosten.",
  "Real exchange rates": "Echte wisselkoersen",
  "We use the mid-market exchange rate — the same one you see on Google. No hidden markup.":
    "Wij gebruiken de mid-market wisselkoers — dezelfde die je op Google ziet. Geen verborgen opslag.",
  "Worldwide ATM withdrawals": "Wereldwijd geld opnemen",
  "Withdraw up to £200 abroad per month for free. After that, a flat £1 fee per withdrawal — never a percentage.":
    "Neem in het buitenland tot £200 per maand gratis op. Daarna een vast tarief van £1 per opname — nooit een percentage.",
  "Instant notifications abroad": "Directe meldingen in het buitenland",
  "Get notified the moment your card is used abroad. Spot unauthorised transactions immediately and freeze your card in one tap.":
    "Krijg een melding zodra je pas in het buitenland wordt gebruikt. Herken onbevoegde transacties direct en blokkeer je pas met één tik.",
  "Mosey current account holders get excellent foreign exchange as standard — no add-on needed. Whether you're travelling for a weekend or living abroad, your card works the same way it does at home.":
    "Mosey-rekeninghouders krijgen standaard uitstekende wisselkoersen — geen extra product nodig. Of je nu een weekend weg bent of in het buitenland woont, je pas werkt precies zoals thuis.",

  // Easy Access Savings page
  "Flexible Savings": "Flexibel sparen",
  "Easy Access Savings": "Direct opneembaar sparen",
  "Earn 4.6% AER with no notice period and no limit on withdrawals. Your money is always within reach.":
    "Verdien 4,6% AER zonder opzegtermijn en zonder limiet op opnames. Je geld is altijd binnen handbereik.",
  "Open an Easy Access Account": "Open een direct opneembare rekening",
  "What makes Easy Access Savings work for you.": "Waarom direct opneembaar sparen bij je past.",
  "4.6% AER variable": "4,6% AER variabel",
  "One of the highest easy-access rates available to UK savers. Rate is reviewed monthly and remains near the top of the market.":
    "Een van de hoogste direct opneembare rentes voor Britse spaarders. De rente wordt maandelijks herzien en blijft in de top van de markt.",
  "Unlimited withdrawals": "Onbeperkt opnemen",
  "Withdraw any amount, any time, with no penalty and no notice period. Funds are in your current account the same working day.":
    "Neem elk bedrag op elk moment op, zonder boete en zonder opzegtermijn. Het geld staat dezelfde werkdag op je betaalrekening.",
  "No minimum balance": "Geen minimumsaldo",
  "Start saving from as little as £1. There's no minimum balance to earn interest.":
    "Begin met sparen vanaf slechts £1. Er is geen minimumsaldo om rente te verdienen.",
  "Your savings are protected by the Financial Services Compensation Scheme up to £85,000 per person.":
    "Je spaargeld is beschermd door het Financial Services Compensation Scheme, tot £85.000 per persoon.",
  "The Mosey Easy Access Savings Account is for people who want their money to work harder without giving up flexibility. There's no fixed term, no notice period, and no limit on how many times you can dip into your savings.":
    "De direct opneembare spaarrekening van Mosey is voor mensen die hun geld harder willen laten werken zonder flexibiliteit op te geven. Geen vaste looptijd, geen opzegtermijn en geen limiet op hoe vaak je je spaargeld aanspreekt.",

  // Fixed Rate Savings page
  "Fixed Rate": "Vaste rente",
  "Fixed Rate Savings": "Sparen met vaste rente",
  "Lock in 5.1% AER for 12 months and know exactly what you'll earn. Minimum deposit £500.":
    "Leg 5,1% AER voor 12 maanden vast en weet precies wat je verdient. Minimale inleg £500.",
  "Open a Fixed Rate Account": "Open een vasterente-rekening",
  "What makes Fixed Rate Savings work for you.": "Waarom sparen met vaste rente bij je past.",
  "5.1% AER fixed for 12 months": "5,1% AER vast voor 12 maanden",
  "Our best savings rate, guaranteed for the full 12-month term. You'll know exactly what you'll earn before you open the account.":
    "Onze beste spaarrente, gegarandeerd voor de volledige looptijd van 12 maanden. Je weet precies wat je verdient voordat je de rekening opent.",
  "Open from £500": "Openen vanaf £500",
  "Start earning our top rate with a minimum deposit of £500. Maximum balance £250,000 per person.":
    "Verdien onze toprente met een minimale inleg van £500. Maximaal saldo £250.000 per persoon.",
  "Guaranteed return": "Gegarandeerd rendement",
  "Unlike easy-access accounts, your rate won't change during your term. Plan your finances with certainty.":
    "Anders dan bij direct opneembare rekeningen verandert je rente niet tijdens de looptijd. Plan je financiën met zekerheid.",
  "Our fixed-rate savings account is for people who don't need immediate access to their money and want to earn as much interest as possible. Lock in 5.1% AER for 12 months and watch a £10,000 deposit grow to £10,510 by maturity.":
    "Onze spaarrekening met vaste rente is voor mensen die hun geld niet direct nodig hebben en zoveel mogelijk rente willen verdienen. Leg 5,1% AER voor 12 maanden vast en zie een inleg van £10.000 groeien naar £10.510 op de einddatum.",

  // Business Current Account page
  "Business Account": "Zakelijke rekening",
  "Business Current Account": "Zakelijke betaalrekening",
  "A full-featured business current account with no monthly fee for your first year.":
    "Een complete zakelijke betaalrekening zonder maandelijkse kosten in je eerste jaar.",
  "What makes Business Current Account work for you.": "Waarom onze zakelijke betaalrekening bij je past.",
  "Free for 12 months": "12 maanden gratis",
  "No monthly fee for the first 12 months. After that, £7 per month with unlimited UK transactions included.":
    "Geen maandelijkse kosten in de eerste 12 maanden. Daarna £7 per maand, inclusief onbeperkte Britse transacties.",
  "See every payment in and out the moment it happens. Stay on top of cash flow without checking your balance manually.":
    "Zie elke betaling in en uit op het moment dat die plaatsvindt. Houd grip op je cashflow zonder handmatig je saldo te checken.",
  "Multi-user access": "Toegang voor meerdere gebruikers",
  "Give team members read-only or payment-authorisation access. Full audit trail of every action.":
    "Geef teamleden alleen-lezen- of betalingsautorisatietoegang. Volledig audittrail van elke actie.",
  "Accounting integration": "Boekhoudkoppeling",
  "Connect to Xero, QuickBooks, or FreeAgent. Transactions sync automatically every hour.":
    "Koppel aan Xero, QuickBooks of FreeAgent. Transacties synchroniseren automatisch elk uur.",
  "The Mosey Business Current Account is built for businesses that want modern banking without the legacy bank experience. Open entirely online, manage everything in the app, and connect to the tools your business already uses.":
    "De zakelijke betaalrekening van Mosey is gebouwd voor bedrijven die modern willen bankieren zonder de ervaring van een traditionele bank. Volledig online te openen, alles te beheren in de app en te koppelen aan de tools die je bedrijf al gebruikt.",

  // Business Lending page
  "Business Finance": "Zakelijke financiering",
  "Business Lending": "Zakelijke kredieten",
  "Flexible loans and overdrafts to help your business grow on your terms. Decisions in 48 hours.":
    "Flexibele leningen en kredieten om je bedrijf op jouw voorwaarden te laten groeien. Beslissing binnen 48 uur.",
  "Apply for Business Finance": "Vraag zakelijke financiering aan",
  "Apply for Finance": "Vraag financiering aan",
  "What makes Business Lending work for you.": "Waarom zakelijke kredieten van Mosey bij je passen.",
  "Business loans from £10,000": "Zakelijke leningen vanaf £10.000",
  "Borrow from £10,000 to £500,000 over 1 to 7 years at a fixed rate. No early repayment charges.":
    "Leen van £10.000 tot £500.000 over 1 tot 7 jaar tegen een vaste rente. Geen boete bij vervroegd aflossen.",
  "Overdraft facilities": "Kredietfaciliteiten",
  "A pre-agreed overdraft to smooth out seasonal cash flow. Only pay interest on what you use.":
    "Een vooraf afgesproken krediet om seizoensgebonden cashflow op te vangen. Betaal alleen rente over wat je gebruikt.",
  "Invoice finance": "Factuurfinanciering",
  "Release cash tied up in unpaid invoices. Get up to 90% of an invoice's value within 24 hours of raising it.":
    "Maak geld vrij dat vastzit in onbetaalde facturen. Ontvang tot 90% van de factuurwaarde binnen 24 uur na verzending.",
  "48-hour decisions": "Beslissing binnen 48 uur",
  "Submit your application online and get a lending decision within two business days in most cases.":
    "Dien je aanvraag online in en ontvang in de meeste gevallen binnen twee werkdagen een kredietbeslissing.",
  "Growing a business often means needing capital before revenue catches up. Mosey's business lending products are designed to give you the flexibility to invest, hire, and expand.":
    "Een bedrijf laten groeien betekent vaak kapitaal nodig hebben voordat de omzet volgt. De zakelijke kredietproducten van Mosey geven je de flexibiliteit om te investeren, aan te nemen en uit te breiden.",

  // Navigation labels (seed-nav)
  "Personal": "Particulier",
  "Easy Access": "Direct opneembaar",
  "Personal Loans": "Persoonlijke leningen",
  "Merchant Services": "Betaaldiensten",
  "Mortgages": "Hypotheken",
  "Find your mortgage": "Vind je hypotheek",
  "Buy-to-Let": "Verhuurhypotheek",
  "Stocks & Shares ISA": "Beleggings-ISA",
  "Pensions": "Pensioenen",
  "Help": "Hulp",
  "FAQs": "Veelgestelde vragen",
  "Contact Us": "Contact",
  "Find a Branch": "Vind een filiaal",
  "About": "Over ons",
  "About Mosey": "Over Mosey",
  "Careers": "Werken bij",
  "Press": "Pers",

  // Nav stub pages (seed-nav PAGE_CONTENT)
  "Borrow from £1,000 to £25,000 with a fixed rate and no early repayment fees. Get a decision in minutes.":
    "Leen van £1.000 tot £25.000 tegen een vaste rente en zonder boete bij vervroegd aflossen. Beslissing binnen enkele minuten.",
  "Accept card payments in-store and online. Competitive rates, next-day settlement, and 24/7 support.":
    "Accepteer pinbetalingen in de winkel en online. Scherpe tarieven, uitbetaling de volgende dag en 24/7 ondersteuning.",
  "Invest up to £20,000 tax-free each year. Choose from thousands of funds, shares, and ETFs.":
    "Beleg elk jaar tot £20.000 belastingvrij. Kies uit duizenden fondsen, aandelen en ETF's.",
  "A self-invested personal pension (SIPP) that puts you in control. Start with as little as £50 a month.":
    "Een zelfbeheerd persoonlijk pensioen (SIPP) waarmee jij de controle hebt. Begin al vanaf £50 per maand.",
  "Plan My Retirement": "Plan mijn pensioen",
  "Frequently Asked Questions": "Veelgestelde vragen",
  "Quick answers to the questions we hear most — from opening an account to reporting a lost card.":
    "Snelle antwoorden op de vragen die we het vaakst horen — van een rekening openen tot een verloren pas melden.",
  "Browse FAQs": "Bekijk veelgestelde vragen",
  "With over 140 branches across the UK, expert advice is never far away. Find your nearest location.":
    "Met meer dan 140 filialen in het VK is deskundig advies nooit ver weg. Vind je dichtstbijzijnde locatie.",
  "Buy-to-Let Mortgages": "Verhuurhypotheken",
  "Competitive buy-to-let rates for individual landlords and portfolio investors. Free valuation included.":
    "Scherpe verhuurhypotheekrentes voor particuliere verhuurders en portefeuillebeleggers. Gratis taxatie inbegrepen.",
  "See BTL Rates": "Bekijk verhuurrentes",
  "About Us": "Over ons",
  "Founded in 1998, Mosey Bank has grown from a single branch in Leeds to a national bank serving 2 million customers.":
    "Opgericht in 1998 is Mosey Bank uitgegroeid van één filiaal in Leeds tot een landelijke bank met 2 miljoen klanten.",
  "Meet the Team": "Ontmoet het team",
  "Join a team that puts people first — customers and colleagues. We're always looking for exceptional people.":
    "Kom werken bij een team dat mensen vooropstelt — klanten én collega's. We zijn altijd op zoek naar uitzonderlijke mensen.",
  "See Open Roles": "Bekijk vacatures",
  "Press & Media": "Pers & media",
  "Latest news, press releases, and media resources from Mosey Bank.":
    "Het laatste nieuws, persberichten en mediamateriaal van Mosey Bank.",
  "View Press Releases": "Bekijk persberichten",
  "Learn More": "Meer informatie",

  // FAQ items (seed-faqs + homepage FAQ blocks)
  "How do I open a current account?": "Hoe open ik een betaalrekening?",
  "You can open a Mosey current account online in around 10 minutes. All you need is a smartphone, a valid UK address, and proof of identity. We run a soft credit check that won't affect your credit score.":
    "Je opent een Mosey-betaalrekening online in ongeveer 10 minuten. Je hebt alleen een smartphone, een geldig Brits adres en een identiteitsbewijs nodig. We doen een zachte kredietcheck die je kredietscore niet beïnvloedt.",
  "What savings rates do you offer?": "Welke spaarrentes bieden jullie?",
  "We currently offer an easy-access savings account at 4.6% AER and a 1-year fixed-rate account at 5.1% AER. Rates are variable on easy-access accounts and fixed for the term on fixed-rate accounts.":
    "We bieden momenteel een direct opneembare spaarrekening tegen 4,6% AER en een 1-jarige vasterente-rekening tegen 5,1% AER. De rente is variabel op direct opneembare rekeningen en vast gedurende de looptijd op vasterente-rekeningen.",
  "How does the mortgage application work?": "Hoe werkt de hypotheekaanvraag?",
  "Start by getting a decision in principle online — it takes around 10 minutes and won't affect your credit score. One of our advisors will then call you to discuss your options and guide you through the full application.":
    "Begin met een voorlopig akkoord online — het duurt ongeveer 10 minuten en beïnvloedt je kredietscore niet. Een van onze adviseurs belt je daarna om je opties te bespreken en je door de volledige aanvraag te begeleiden.",
  "Is my money protected?": "Is mijn geld beschermd?",
  "Yes. Mosey Bank is authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority. Eligible deposits are protected by the FSCS up to £85,000 per person.":
    "Ja. Mosey Bank heeft een vergunning van de Prudential Regulation Authority en staat onder toezicht van de Financial Conduct Authority. In aanmerking komende tegoeden zijn beschermd door het FSCS tot £85.000 per persoon.",
  "How do I switch banks to Mosey?": "Hoe stap ik over naar Mosey?",
  "We use the Current Account Switch Service (CASS), which moves all your direct debits and standing orders automatically within 7 working days. Your old account closes on the switch date and any payments to or from your old account are forwarded for 3 years.":
    "We gebruiken de Current Account Switch Service (CASS), die al je incasso's en periodieke overboekingen automatisch binnen 7 werkdagen verhuist. Je oude rekening sluit op de overstapdatum en betalingen van of naar je oude rekening worden 3 jaar lang doorgestuurd.",
  "What do I do if my card is lost or stolen?": "Wat doe ik als mijn pas kwijt of gestolen is?",
  "Open the Mosey app and go to Card Controls to freeze your card immediately. If you're sure it's lost or stolen, tap 'Cancel card' to order a replacement, which arrives within 3–5 working days. You can also call our 24/7 fraud line.":
    "Open de Mosey-app en ga naar Pasbeheer om je pas direct te blokkeren. Weet je zeker dat hij kwijt of gestolen is, tik dan op 'Pas annuleren' om een vervangende pas te bestellen; die komt binnen 3-5 werkdagen aan. Je kunt ook onze 24/7 fraudelijn bellen.",

  // SEO contract values (seed-content page properties)
  "Personal Banking | Mosey Bank": "Particulier bankieren | Mosey Bank",
  "Current accounts, savings, and mortgages designed around your everyday needs. Open an account in minutes with Mosey Bank.":
    "Betaalrekeningen, spaarrekeningen en hypotheken rond jouw dagelijkse behoeften. Open in enkele minuten een rekening bij Mosey Bank.",
  "Business Banking | Mosey Bank": "Zakelijk bankieren | Mosey Bank",
  "Current accounts, lending, and payment solutions for UK businesses of every size. Free for your first 12 months.":
    "Betaalrekeningen, kredieten en betaaloplossingen voor Britse bedrijven van elke omvang. Gratis in je eerste 12 maanden.",
  "Investments & ISAs | Mosey Bank": "Beleggen & ISA's | Mosey Bank",
  "Stocks & Shares ISAs, pensions, and long-term savings products. Start investing from £25 a month.":
    "Beleggings-ISA's, pensioenen en spaarproducten voor de lange termijn. Beleg al vanaf £25 per maand.",
  "Help & Support | Mosey Bank": "Hulp & ondersteuning | Mosey Bank",
  "FAQs, contact options, and branch finder. Speak to a real person seven days a week via in-app chat or phone.":
    "Veelgestelde vragen, contactopties en filiaalzoeker. Spreek zeven dagen per week een echt mens via chat of telefoon.",
  "About Us | Mosey Bank": "Over ons | Mosey Bank",
  "Our story, values, team, careers, and press. Mosey Bank is banking built around people, not branches.":
    "Ons verhaal, onze waarden, ons team, vacatures en pers. Mosey Bank is bankieren rond mensen, niet rond filialen.",
  "Mortgages | Mosey Bank": "Hypotheken | Mosey Bank",
  "Find your mortgage rate in minutes. Decision in principle online in 10 minutes without affecting your credit score.":
    "Vind je hypotheekrente in enkele minuten. Voorlopig akkoord online in 10 minuten, zonder invloed op je kredietscore.",
  "Fee-Free Current Account | Mosey Bank": "Gratis betaalrekening | Mosey Bank",
  "A fee-free everyday account with instant notifications, smart budgeting tools, and no hidden charges. Open in 10 minutes.":
    "Een gratis betaalrekening voor elke dag, met directe meldingen, slimme budgettools en zonder verborgen kosten. Geopend in 10 minuten.",
  "Savings Accounts up to 5.1% AER | Mosey Bank": "Spaarrekeningen tot 5,1% AER | Mosey Bank",
  // (savings metaDescription reuses the savings page description translated above)
  "Mosey Bank | Banking Built Around You": "Mosey Bank | Bankieren dat om jou draait",
  "Fee-free current accounts, savings up to 5.1% AER, and mortgages with a decision in principle in 10 minutes.":
    "Gratis betaalrekeningen, sparen tot 5,1% AER en hypotheken met een voorlopig akkoord binnen 10 minuten.",

  // Footer block (seed-footer.ts)
  "Banking built around you · Mosey Bank": "Bankieren dat om jou draait · Mosey Bank",

  // SiteSettings block (seed-settings.ts)
  "Search pages…": "Zoek pagina's…",
  "Searching…": "Zoeken…",
  "No results for “{query}”": "Geen resultaten voor “{query}”",
  "Type at least 2 characters to search": "Typ minstens 2 tekens om te zoeken",

  // SiteBanner block (seed-settings.ts)
  "New: instant payments are now available": "Nieuw: directe betalingen zijn nu beschikbaar",
  "Learn more": "Meer informatie",
};
