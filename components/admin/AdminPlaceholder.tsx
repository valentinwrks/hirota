// Empty-section placeholder for Sprint A. Sections gain real functionality in
// later sprints (B: Orders, C: price/stock editors).
export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <div className="h-[26px] flex items-center px-3 border-b border-border text-sm leading-none text-ink-60 sticky top-0 bg-paper-30 backdrop-blur-xs">
        {title}
      </div>
      <div className="p-6 text-[13px] text-ink-40">
        No content yet — this section is a placeholder.
      </div>
    </div>
  );
}
