import type { ExperienceContent } from "@/components/cms/sdkTypes";
import { CompositionExperience } from "./CompositionExperience";

export default function DynamicExperience({ content }: { content: ExperienceContent }) {
  return <CompositionExperience name="DynamicExperience" content={content} />;
}
