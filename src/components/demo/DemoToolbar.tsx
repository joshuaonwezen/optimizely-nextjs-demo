import { cookies } from "next/headers";
import AudienceSwitcher from "./AudienceSwitcher";

export default async function DemoToolbar() {
  const cookieStore = await cookies();
  return (
    <AudienceSwitcher
      initialPersona={cookieStore.get("demo_persona")?.value ?? ""}
      initialBucketingId={cookieStore.get("demo_bucketing_id")?.value ?? ""}
      initialLoggedIn={!!cookieStore.get("demo_bucketing_id")?.value}
      initialUserId={cookieStore.get("optimizelyEndUserId")?.value ?? "anonymous"}
    />
  );
}
