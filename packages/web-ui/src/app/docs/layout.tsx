import { DocsSidebar } from '@/components/docs/DocsSidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-8">
      {/* Sticky docs sidebar */}
      <aside className="hidden lg:block w-[200px] shrink-0">
        <DocsSidebar />
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
