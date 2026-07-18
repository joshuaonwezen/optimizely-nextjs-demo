// Known CMS instances the seed tool can target. Credentials live in .env.local
// under the instance's env var suffix (base names for "personal") and are
// resolved server-side by the seed API route - only ids/labels reach the client.
export const SEED_INSTANCES = [
  { id: "personal", label: "Personal", suffix: "" },
  { id: "joshcms", label: "joshCMS", suffix: "_JOSHCMS" },
  { id: "harrynewcms", label: "harryNewCMS", suffix: "_HARRYNEWCMS" },
  { id: "mostinnewcms", label: "mostinNewCMS", suffix: "_MOSTINNEWCMS" },
  { id: "kastlenewcms", label: "kastleNewCMS", suffix: "_KASTLENEWCMS" },
] as const;

export type SeedInstanceId = (typeof SEED_INSTANCES)[number]["id"];
