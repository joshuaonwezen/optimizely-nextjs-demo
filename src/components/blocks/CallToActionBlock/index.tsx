import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface CallToActionData {
  label?: string | null;
  link?: string | null;
  __context?: any;
}

type CallToActionProps = CallToActionData & {
  content?: CallToActionData;
  displaySettings?: Record<string, string | boolean>;
};

const VARIANT_CLASSES: Record<string, string> = {
  brand: "bg-gradient-brand text-on-brand",
  outline: "bg-transparent text-brand border-2 border-brand",
  surface: "bg-surface-lowest text-brand",
};

export default function CallToActionBlock(props: CallToActionProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const variant = (ds?.variant as string) ?? "brand";
  const isLarge = ds?.size === "large";
  const vs = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.brand;

  return (
    <section {...pa((data as any).__composition)} className="py-24 bg-surface-low">
      <div className="max-w-7xl mx-auto px-8 text-center">
        {data.link && (
          <a
            href={data.link}
            {...pa("label")}
            className={`hover-lift font-display inline-block rounded-lg font-semibold ${isLarge ? "px-12 py-5 text-lg" : "px-10 py-4 text-base"} ${vs}`}
          >
            {data.label ?? "Get Started"}
          </a>
        )}
      </div>
    </section>
  );
}
