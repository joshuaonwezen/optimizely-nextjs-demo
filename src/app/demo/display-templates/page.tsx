import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import SourcePanel from "@/components/demo/SourcePanel";
import FeatureItemBlock from "@/components/blocks/FeatureItemBlock";
import ProductCardBlock from "@/components/blocks/ProductCardBlock";
import CallToActionBlock from "@/components/blocks/CallToActionBlock";
import SectionHeadingBlock from "@/components/blocks/SectionHeadingBlock";
import TestimonialBlock from "@/components/blocks/TestimonialBlock";
import StatsCounterBlock from "@/components/blocks/StatsCounterBlock";
import OutcomeItemBlock from "@/components/blocks/OutcomeItemBlock";
import AuthorBlock from "@/components/blocks/AuthorBlock";
import TeamMemberBlock from "@/components/blocks/TeamMemberBlock";
import PricingTierBlock from "@/components/blocks/PricingTierBlock";
import FaqItemBlock from "@/components/blocks/FaqItemBlock";
import LogoGridBlock from "@/components/blocks/LogoGridBlock";
import TextBlock from "@/components/blocks/RichTextBlock";
import ImageBlock from "@/components/blocks/ImageBlock";
import HeroBlock from "@/components/blocks/HeroBlock";
import ProductHeroBlock from "@/components/blocks/ProductHeroBlock";

const sharedSettingsTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/blocks/_shared/displayTemplateSettings.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Display Templates Demo",
};

const SAMPLE_IMAGE = "/demo/display-template-sample.png";

const FEATURE = {
  title: "Instant transfers",
  description: "Move money between Mosey accounts in seconds, any time of day, with no fees on standard transfers.",
};

const PRODUCT = {
  icon: "savings",
  title: "Flex Saver",
  description: "A savings account that adapts to your habits with automatic round-ups and goal tracking.",
  linkText: "Explore Flex Saver →",
};

const QUOTE = {
  quote: "Switching to Mosey Bank took one afternoon. The app does everything my old bank needed a branch visit for.",
  authorName: "Sarah Chen",
  authorRole: "Small business owner",
};

const AUTHOR = {
  name: "Priya Patel",
  role: "Head of Personal Banking",
  bio: "<p>Priya writes about everyday money management and leads the personal banking product team at Mosey Bank.</p>",
  linkedinUrl: "#",
};

const TEAM_MEMBER = {
  name: "Marcus Webb",
  role: "Chief Technology Officer",
  bio: "Marcus leads the engineering teams behind the Mosey app and open banking platform.",
  linkedinUrl: "#",
};

const PRICING = {
  name: "Everyday",
  price: "£0",
  period: "/month",
  features: ["Free instant transfers", "Round-up savings", "Spending insights", "24/7 chat support"],
  ctaText: "Open an account",
  ctaLink: "#",
};

const FAQ = {
  question: "How long does it take to open an account?",
  answer: "Most customers finish sign-up in under ten minutes. You will need photo ID and a UK address to get started.",
};

const RICH_TEXT_BODY =
  "<p>Display templates separate <strong>what</strong> content says from <strong>how</strong> it looks. The editor picks a template and settings in Visual Builder; the component maps those choices to Tailwind classes at render time.</p>";

const BACKGROUND_CHOICES: Array<{ key: string; label: string }> = [
  { key: "white", label: "White" },
  { key: "offWhite", label: "Off-white" },
  { key: "blue", label: "Blue" },
  { key: "blueGrad", label: "Blue gradient" },
  { key: "purple", label: "Purple" },
  { key: "dark", label: "Dark" },
  { key: "transparent", label: "None" },
];

const HEADING_SIZE_CHOICES: Array<{ key: string; label: string }> = [
  { key: "xl", label: "Extra large (H1)" },
  { key: "lg", label: "Large (H2)" },
  { key: "md", label: "Medium (H3)" },
  { key: "sm", label: "Small (H4)" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-20">
      <h2 className="font-display text-2xl font-extrabold text-on-surface mb-2">{title}</h2>
      <p className="text-sm text-on-surface-variant max-w-2xl mb-8">{description}</p>
      {children}
    </section>
  );
}

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function DisplayTemplatesDemoPage() {
  return (
    <div className="min-h-screen bg-surface">
      <DemoHero
        title="Display Templates"
        description="Every display template variant in this project, rendered side by side with sample content. Editors pick these same templates and settings in Visual Builder - no content changes, no code changes."
      />

      <div className="max-w-7xl mx-auto px-8 py-16">

        <Section
          title="Feature Item"
          description="Three visual layouts for the same title and description. The fallback (no template selected) renders a plain white card."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Variant label="No template (fallback)">
              <FeatureItemBlock {...FEATURE} />
            </Variant>
            <Variant label="Outlined card">
              <FeatureItemBlock {...FEATURE} displayTemplateKey="FeatureItemOutlinedTemplate" />
            </Variant>
            <Variant label="Colored card">
              <FeatureItemBlock {...FEATURE} displayTemplateKey="FeatureItemBrandTemplate" />
            </Variant>
            <Variant label="Flat (divider only)">
              <FeatureItemBlock {...FEATURE} displayTemplateKey="FeatureItemFlatTemplate" />
            </Variant>
          </div>
        </Section>

        <Section
          title="Shared setting: Background color"
          description="One shared setting definition drives every block. Here the Outlined card template sweeps all seven background choices."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BACKGROUND_CHOICES.map(({ key, label }) => (
              <Variant key={key} label={label}>
                <FeatureItemBlock
                  {...FEATURE}
                  displayTemplateKey="FeatureItemOutlinedTemplate"
                  displaySettings={{ background: key }}
                />
              </Variant>
            ))}
          </div>
        </Section>

        <Section
          title="Shared settings: Heading size and Font style"
          description="Heading size maps to responsive Tailwind text classes. Font style switches between Plus Jakarta Sans (Modern) and Inter (Classic)."
        >
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {HEADING_SIZE_CHOICES.map(({ key, label }) => (
              <Variant key={key} label={label}>
                <FeatureItemBlock
                  {...FEATURE}
                  displayTemplateKey="FeatureItemOutlinedTemplate"
                  displaySettings={{ headingSize: key }}
                />
              </Variant>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Variant label="Modern (Plus Jakarta Sans)">
              <FeatureItemBlock
                {...FEATURE}
                displayTemplateKey="FeatureItemOutlinedTemplate"
                displaySettings={{ fontStyle: "modern", headingSize: "md" }}
              />
            </Variant>
            <Variant label="Classic (Inter)">
              <FeatureItemBlock
                {...FEATURE}
                displayTemplateKey="FeatureItemOutlinedTemplate"
                displaySettings={{ fontStyle: "classic", headingSize: "md" }}
              />
            </Variant>
          </div>
        </Section>

        <Section
          title="Product Card"
          description="Default and Featured templates share the same settings; Featured adds a highlight ring. Backgrounds come from the shared set."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Variant label="Default">
              <ProductCardBlock {...PRODUCT} />
            </Variant>
            <Variant label="Featured (highlighted)">
              <ProductCardBlock {...PRODUCT} displayTemplateKey="ProductCardFeaturedTemplate" />
            </Variant>
            <Variant label="Default, Blue gradient">
              <ProductCardBlock {...PRODUCT} displaySettings={{ background: "blueGrad" }} />
            </Variant>
            <Variant label="Default, no icon, Dark">
              <ProductCardBlock {...PRODUCT} displaySettings={{ background: "dark", showIcon: false }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Call to Action"
          description="Four button treatments for the same label and link, plus a size setting on each."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Variant label="No template (brand button)">
              <CallToActionBlock label="Open an account" link="#" />
            </Variant>
            <Variant label="Outlined button">
              <CallToActionBlock label="Open an account" link="#" displayTemplateKey="CallToActionOutlineTemplate" />
            </Variant>
            <Variant label="White background button">
              <CallToActionBlock label="Open an account" link="#" displayTemplateKey="CallToActionSurfaceTemplate" />
            </Variant>
            <Variant label="Text link with arrow">
              <CallToActionBlock label="Open an account" link="#" displayTemplateKey="CallToActionGhostTemplate" />
            </Variant>
          </div>
        </Section>

        <Section
          title="Section Heading"
          description="Left-aligned with an optional accent bar, or centered. Both accept the shared background, heading size, alignment, and font settings."
        >
          <div className="grid lg:grid-cols-2 gap-6">
            <Variant label="Default (left-aligned), accent bar">
              <SectionHeadingBlock
                heading="Banking that fits your life"
                subheading="Everything you need to manage money day to day, in one app."
                displayTemplateKey="SectionHeadingDefaultTemplate"
                displaySettings={{ showAccent: true, headingSize: "md" }}
              />
            </Variant>
            <Variant label="Centered heading, Off-white background">
              <SectionHeadingBlock
                heading="Banking that fits your life"
                subheading="Everything you need to manage money day to day, in one app."
                displayTemplateKey="SectionHeadingCenteredTemplate"
                displaySettings={{ background: "offWhite", headingSize: "md" }}
              />
            </Variant>
          </div>
        </Section>

        <Section
          title="Testimonial"
          description="A boxed card with background choices, or a minimal pull-quote with an accent rail."
        >
          <div className="grid lg:grid-cols-3 gap-6">
            <Variant label="Card (boxed), White">
              <TestimonialBlock {...QUOTE} displayTemplateKey="TestimonialCardTemplate" />
            </Variant>
            <Variant label="Card (boxed), Blue gradient">
              <TestimonialBlock {...QUOTE} displayTemplateKey="TestimonialCardTemplate" displaySettings={{ background: "blueGrad" }} />
            </Variant>
            <Variant label="Minimal (pull-quote with accent)">
              <TestimonialBlock {...QUOTE} displayTemplateKey="TestimonialMinimalTemplate" displaySettings={{ textSize: "sm" }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Stats Counter"
          description="An accent rail with a number color setting, or a highlighted box with layout density. The fallback renders a plain centered stat."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            <Variant label="No template (fallback)">
              <StatsCounterBlock value="2.4" suffix="M" label="Active customers" />
            </Variant>
            <Variant label="Accent rail, Blue number">
              <StatsCounterBlock value="2.4" suffix="M" label="Active customers" displayTemplateKey="StatsCounterAccentTemplate" />
            </Variant>
            <Variant label="Accent rail, Purple number">
              <StatsCounterBlock value="2.4" suffix="M" label="Active customers" displayTemplateKey="StatsCounterAccentTemplate" displaySettings={{ accentColor: "tertiary" }} />
            </Variant>
            <Variant label="Highlighted, Dark, compact">
              <StatsCounterBlock value="2.4" suffix="M" label="Active customers" displayTemplateKey="StatsCounterHighlightTemplate" displaySettings={{ background: "dark", size: "compact" }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Outcome Stat"
          description="Inline places the number and label side by side; Boxed defaults to the blue gradient."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <Variant label="Inline stat">
              <OutcomeItemBlock stat="98" suffix="%" label="of support chats answered in under a minute" displayTemplateKey="OutcomeItemInlineTemplate" />
            </Variant>
            <Variant label="Inline stat, Off-white badge">
              <OutcomeItemBlock stat="98" suffix="%" label="of support chats answered in under a minute" displayTemplateKey="OutcomeItemInlineTemplate" displaySettings={{ background: "offWhite", headingSize: "md" }} />
            </Variant>
            <Variant label="Boxed stat">
              <OutcomeItemBlock stat="98" suffix="%" label="of support chats answered in under a minute" displayTemplateKey="OutcomeItemBrandTemplate" />
            </Variant>
          </div>
        </Section>

        <Section
          title="Author"
          description="A compact byline, a profile card, and the full-bio fallback rendered when no template is selected."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <Variant label="Author byline">
              <AuthorBlock {...AUTHOR} displayTemplateKey="AuthorInlineTemplate" displaySettings={{ background: "offWhite", showSocial: true }} />
            </Variant>
            <Variant label="Profile card">
              <AuthorBlock {...AUTHOR} displayTemplateKey="AuthorProfileTemplate" displaySettings={{ showLinkedIn: true }} />
            </Variant>
            <Variant label="No template (full bio)">
              <AuthorBlock {...AUTHOR} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Team Member"
          description="Vertical card fallback versus the horizontal card template with a background choice."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <Variant label="No template (vertical card)">
              <TeamMemberBlock {...TEAM_MEMBER} />
            </Variant>
            <Variant label="Horizontal card">
              <TeamMemberBlock {...TEAM_MEMBER} displayTemplateKey="TeamMemberHorizontalTemplate" />
            </Variant>
            <Variant label="Horizontal card, Blue">
              <TeamMemberBlock {...TEAM_MEMBER} displayTemplateKey="TeamMemberHorizontalTemplate" displaySettings={{ background: "blue" }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Pricing Tier"
          description="Standard versus the Compact template, which tightens padding and type. Highlighting comes from content; backgrounds from the shared set."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            <Variant label="No template (standard)">
              <PricingTierBlock {...PRICING} />
            </Variant>
            <Variant label="Standard, highlighted">
              <PricingTierBlock {...PRICING} highlighted />
            </Variant>
            <Variant label="Compact">
              <PricingTierBlock {...PRICING} displayTemplateKey="PricingTierCompactTemplate" />
            </Variant>
            <Variant label="Compact, Blue gradient">
              <PricingTierBlock {...PRICING} displayTemplateKey="PricingTierCompactTemplate" displaySettings={{ background: "blueGrad" }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="FAQ Item"
          description="Boxed card fallback versus the minimal divider-only template. Click a question to expand it."
        >
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Variant label="No template (boxed)">
              <FaqItemBlock {...FAQ} />
            </Variant>
            <Variant label="Minimal (divider only)">
              <FaqItemBlock {...FAQ} displayTemplateKey="FaqItemFlatTemplate" />
            </Variant>
          </div>
        </Section>

        <Section
          title="Text Block"
          description="The Narrow layout template constrains line length and adds text size, alignment, font, and vertical padding settings."
        >
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Variant label="No template (standard width)">
              <TextBlock body={RICH_TEXT_BODY} />
            </Variant>
            <Variant label="Narrow layout, large text, compact padding">
              <TextBlock body={RICH_TEXT_BODY} displayTemplateKey="TextBlockNarrowTemplate" displaySettings={{ textSize: "lg", verticalPadding: "compact" }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Image"
          description="The Rounded corners template adds a radius and an aspect ratio setting that crops the image to a fixed shape."
        >
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Variant label="No template (natural size)">
              <ImageBlock image={{ url: { default: SAMPLE_IMAGE } }} altText="Sample gradient" caption="Original aspect ratio" />
            </Variant>
            <Variant label="Rounded corners, 1:1 Square">
              <ImageBlock image={{ url: { default: SAMPLE_IMAGE } }} altText="Sample gradient" caption="Cropped square with rounded corners" displayTemplateKey="ImageBlockRoundedTemplate" displaySettings={{ aspectRatio: "r1x1" }} />
            </Variant>
          </div>
        </Section>

        <Section
          title="Logo Grid"
          description="Logo size, partner names, and alignment settings. Placeholder tiles render here because no CMS images are attached; in the CMS the Color template disables the grayscale filter."
        >
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Variant label="No template (grayscale, centered)">
              <LogoGridBlock heading="Trusted by teams everywhere" />
            </Variant>
            <Variant label="Full color, small, names, left-aligned">
              <LogoGridBlock heading="Trusted by teams everywhere" displayTemplateKey="LogoGridColorTemplate" displaySettings={{ size: "sm", showNames: true, textAlign: "left" }} />
            </Variant>
          </div>
        </Section>

        <SourcePanel
          heading="Shared settings library"
          files={[
            {
              label: "displayTemplateSettings.ts",
              path: "src/components/blocks/_shared/displayTemplateSettings.ts",
              content: sharedSettingsTs,
            },
          ]}
        />
      </div>

      {/* Full-bleed hero blocks render outside the grid so their w-screen layout is visible */}
      <div className="max-w-7xl mx-auto px-8">
        <h2 className="font-display text-2xl font-extrabold text-on-surface mb-2">Heroes</h2>
        <p className="text-sm text-on-surface-variant max-w-2xl mb-8">
          Full-width blocks with their own template settings: the Hero Default template controls alignment, height, heading size, and font; the Product Hero Compact template reduces height.
        </p>
      </div>
      <div className="mb-10">
        <p className="max-w-7xl mx-auto px-8 text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          Hero, Default template, centered
        </p>
        <HeroBlock
          headline="Money, made simple"
          subheadline="Join two million customers who switched to smarter everyday banking."
          ctaText="Get started"
          ctaLink="#"
          displayTemplateKey="HeroBlockDefaultTemplate"
          displaySettings={{ alignment: "center", headingSize: "lg" }}
        />
      </div>
      <div className="pb-24">
        <p className="max-w-7xl mx-auto px-8 text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          Product Hero, Compact template
        </p>
        <ProductHeroBlock
          badge="New"
          title="Flex Saver"
          description="A savings account that adapts to your habits with automatic round-ups."
          ctaText="Open Flex Saver"
          ctaUrl={{ default: "#" }}
          displayTemplateKey="ProductHeroCompactTemplate"
        />
      </div>
    </div>
  );
}
