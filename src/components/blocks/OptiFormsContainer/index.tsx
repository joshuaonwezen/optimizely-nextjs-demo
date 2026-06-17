import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface OptiFormsContainerData {
  Title?: string | null;
  Description?: string | null;
  SubmitUrl?: { default?: string | null } | null;
  SubmitConfirmationMessage?: string | null;
  __context?: { edit?: boolean } | null;
}

type OptiFormsContainerProps = OptiFormsContainerData & {
  content?: OptiFormsContainerData;
};

export default function OptiFormsContainer(props: OptiFormsContainerProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <section
      data-component="OptiFormsContainer"
      className="py-16"
      data-form-submit-url={data.SubmitUrl?.default ?? "/api/form-submit"}
      data-form-success-message={data.SubmitConfirmationMessage ?? "Thank you! We'll be in touch soon."}
    >
      <div className="max-w-2xl mx-auto px-8">
        {data.Title && (
          <h2
            {...pa("Title")}
            className="font-display text-3xl font-extrabold mb-4 text-on-surface"
          >
            {data.Title}
          </h2>
        )}
        {data.Description && (
          <p
            {...pa("Description")}
            className="text-base mb-2 text-on-surface-variant"
          >
            {data.Description}
          </p>
        )}
        {data.__context?.edit && (
          <p
            {...pa("SubmitConfirmationMessage")}
            className="mt-4 text-xs font-mono text-on-surface-variant/60 cursor-pointer hover:text-on-surface-variant transition-colors"
          >
            Success: {data.SubmitConfirmationMessage || "Click to set success message..."}
          </p>
        )}
      </div>
    </section>
  );
}
