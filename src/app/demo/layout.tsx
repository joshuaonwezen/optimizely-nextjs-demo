import DemoTableOfContents from "@/components/demo/DemoTableOfContents";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="flex">
        <aside className="hidden xl:block w-60 shrink-0">
          <div className="sticky top-24 pl-8 pr-5 pt-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <DemoTableOfContents />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
