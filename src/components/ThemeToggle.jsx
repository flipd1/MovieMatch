export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface border border-border text-fg-muted hover:text-fg hover:border-border-strong transition-colors cursor-pointer shrink-0"
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          className="w-4.5 h-4.5 fill-none stroke-current stroke-[1.6]"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="w-4.5 h-4.5 fill-none stroke-current stroke-[1.6]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.5 13.5A8.5 8.5 0 1110.5 3.5a7 7 0 0010 10z"
          />
        </svg>
      )}
    </button>
  );
}
