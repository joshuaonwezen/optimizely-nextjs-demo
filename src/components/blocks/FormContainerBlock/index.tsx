import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const FormContainerBlockType = contentType({
  key: "FormContainerBlock",
  displayName: "Form Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading" },
    description: { type: "string", displayName: "Description" },
    submitUrl: { type: "url", displayName: "Submit URL" },
    successMessage: { type: "string", displayName: "Success Message" },
  },
});

interface FormContainerData {
  heading?: string | null;
  description?: string | null;
  submitUrl?: { default?: string | null } | null;
  successMessage?: string | null;
}

type FormContainerBlockProps = FormContainerData & {
  content?: FormContainerData;
  displaySettings?: Record<string, string | boolean>;
};

export default function FormContainerBlock(props: FormContainerBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const textAlign = props.displaySettings?.textAlign === "center" ? "text-center" : "text-left";

  return (
    <section
      className="py-16"
      data-form-submit-url={data.submitUrl?.default ?? "/api/form-submit"}
      data-form-success-message={data.successMessage ?? "Thank you! We'll be in touch soon."}
    >
      <div className={`max-w-2xl mx-auto px-8 ${textAlign}`}>
        {data.heading && (
          <h2
            {...pa("heading")}
            className="font-display text-3xl font-extrabold mb-4 text-on-surface"
          >
            {data.heading}
          </h2>
        )}
        {data.description && (
          <p
            {...pa("description")}
            className="text-base mb-2 text-on-surface-variant"
          >
            {data.description}
          </p>
        )}
      </div>
    </section>
  );
}
