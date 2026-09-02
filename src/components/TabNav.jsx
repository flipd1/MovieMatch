const TABS = [
  { id: "discover", label: "Rate & Discover" },
  { id: "theaters", label: "In Theaters" },
  { id: "new", label: "New Releases" },
  { id: "stats", label: "Your Stats", pro: true },
  { id: "lists", label: "My Lists", pro: true },
  { id: "settings", label: "Settings" },
];

export default function TabNav({ activeTab, onChange, isPro }) {
  return (
    <nav className="inline-flex items-center gap-1 bg-surface border border-border rounded-full p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === tab.id
              ? "bg-fg text-bg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          {tab.label}
          {tab.pro && !isPro && (
            <span className="bg-amber-400 text-black text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5">
              Pro
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
