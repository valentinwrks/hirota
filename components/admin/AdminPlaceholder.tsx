// Empty-section placeholder for Sprint A. Sections gain real functionality in
// later sprints (B: Orders, C: price/stock editors).
export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <div className="h-[26px] flex items-center px-3 border-b border-border text-sm leading-none text-foreground-strong sticky top-0 bg-background-header backdrop-blur-xs">
        {title}
      </div>
      <div className="p-6 text-[13px] text-foreground-muted">
        No content yet — this section is a placeholder.
      </div>
    </div>
  );
}
