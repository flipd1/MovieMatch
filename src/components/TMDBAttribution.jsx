export default function TMDBAttribution() {
  return (
    <footer className="border-t border-border mt-16 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-3 text-center">
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <img
            src="/tmdb-logo.svg"
            alt="The Movie Database (TMDB)"
            className="h-4"
          />
        </a>
        <p className="text-xs text-fg-muted max-w-md">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </div>
    </footer>
  );
}
