import type { ExperienceContent } from "@/components/cms/sdkTypes";
import { CompositionExperience } from "./CompositionExperience";

export default function BlankExperience({ content }: { content: ExperienceContent }) {
  return <CompositionExperience name="BlankExperience" content={content} />;
}
