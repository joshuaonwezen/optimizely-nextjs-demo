import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface CallToActionData {
  label?: string | null;
  link?: string | null;
  __context?: any;
}

type CallToActionProps = CallToActionData & {
  content?: CallToActionData;
};

export default function CallToActionBlock(props: CallToActionProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <section
      className="py-24"
      style={{ background: "var(--surface-container-low)" }}
    >
      <div className="max-w-7xl mx-auto px-8 text-center">
        {data.link && (
          <a
            href={data.link}
            {...pa("label")}
            className="hover-lift inline-block px-10 py-4 rounded-lg font-semibold text-base text-on-brand"
            style={{
              fontFamily: "var(--font-display)",
              background: "var(--gradient-brand)",
            }}
          >
            {data.label ?? "Get Started"}
          </a>
        )}
      </div>
    </section>
  );
}
