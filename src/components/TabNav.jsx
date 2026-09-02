const TABS = [
  { id: "discover", label: "Rate & Discover" },
  { id: "theaters", label: "In Theaters" },
  { id: "new", label: "New Releases" },
  // Pro tier has no real billing behind it yet, and TMDB's free API terms
  // are for non-commercial use — so until there's an actual paid plan (or
  // at least a working "how do I get Pro" path instead of a dead-end
  // button), these stay dev-only rather than teasing a paywall to real
  // visitors. Drop `devOnly` here to bring them back for everyone.
  { id: "stats", label: "Your Stats", pro: true, devOnly: true },
  { id: "lists", label: "My Lists", pro: true, devOnly: true },
  { id: "settings", label: "Settings" },
];

export default function TabNav({ activeTab, onChange, isPro }) {
  const visibleTabs = TABS.filter((tab) => !tab.devOnly || import.meta.env.DEV);

  return (
    <nav className="max-w-full overflow-x-auto">
      <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-full p-1 w-max">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
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
      </div>
    </nav>
  );
}
