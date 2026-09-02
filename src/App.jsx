import { useCallback, useLayoutEffect, useRef, useState } from "react";
import SearchBar from "./components/SearchBar";
import RatedMoviesGrid from "./components/RatedMoviesGrid";
import RecommendationsSection from "./components/RecommendationsSection";
import InTheatersSection from "./components/InTheatersSection";
import NewReleasesSection from "./components/NewReleasesSection";
import StatsSection from "./components/StatsSection";
import MyListsSection from "./components/MyListsSection";
import AddToListModal from "./components/AddToListModal";
import RewatchReminder from "./components/RewatchReminder";
import WatchTonightModal from "./components/WatchTonightModal";
import SettingsTab from "./components/SettingsTab";
import TabNav from "./components/TabNav";
import MovieDetail from "./components/MovieDetail";
import TMDBAttribution from "./components/TMDBAttribution";
import ThemeToggle from "./components/ThemeToggle";
import { useRatedMovies } from "./hooks/useRatedMovies";
import { useAuth } from "./hooks/useAuth";
import { useMyServices } from "./hooks/useMyServices";
import { useDismissedMovies } from "./hooks/useDismissedMovies";
import { useIsPro } from "./hooks/useIsPro";
import { useEarlyAccess } from "./hooks/useEarlyAccess";
import { useLists } from "./hooks/useLists";
import { useTheme } from "./hooks/useTheme";
import { isSupabaseConfigured } from "./lib/supabase";

function PosterGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-lg bg-surface animate-pulse"
        />
      ))}
    </div>
  );
}

export default function App() {
  const {
    userId,
    email,
    isAnonymous,
    linkEmail,
    resendLinkEmail,
    loading: authLoading,
  } = useAuth();
  const { ratedMovies, list, rateMovie, loading: ratingsLoading, error } =
    useRatedMovies(userId);
  const { services, setServices } = useMyServices(userId);
  const { dismissedIds, dismissMovie } = useDismissedMovies(userId);
  const { isPro, setIsPro } = useIsPro(userId);
  const { earlyAccess, setEarlyAccess } = useEarlyAccess(userId);
  const {
    lists,
    moviesById,
    createList,
    renameList,
    deleteList,
    addMovieToList,
    removeMovieFromList,
  } = useLists(userId);
  const { theme, toggleTheme } = useTheme();
  const [openMovieId, setOpenMovieId] = useState(null);
  const [openMovieReason, setOpenMovieReason] = useState(null);
  const [watchTonightOpen, setWatchTonightOpen] = useState(false);
  const [addToListMovie, setAddToListMovie] = useState(null);
  const [activeTab, setActiveTab] = useState("discover");
  const scrollPositions = useRef({
    discover: 0,
    theaters: 0,
    new: 0,
    stats: 0,
    lists: 0,
    settings: 0,
  });

  const loading = authLoading || ratingsLoading;

  const openMovie = useCallback((movie, reason) => {
    setOpenMovieId(movie.id);
    setOpenMovieReason(reason ?? null);
  }, []);

  const handleTabChange = useCallback(
    (nextTab) => {
      if (nextTab === activeTab) return;
      scrollPositions.current[activeTab] = window.scrollY;
      setActiveTab(nextTab);
    },
    [activeTab]
  );

  useLayoutEffect(() => {
    const y = scrollPositions.current[activeTab] ?? 0;
    window.scrollTo(0, y);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-bg/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-semibold tracking-tight shrink-0">
            Movie<span className="text-accent-fg">Match</span>
          </h1>
          <SearchBar
            ratedMovies={ratedMovies}
            onRate={rateMovie}
            onOpen={openMovie}
          />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-4">
          <TabNav
            activeTab={activeTab}
            onChange={handleTabChange}
            isPro={isPro}
          />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className={activeTab === "discover" ? "space-y-14" : "hidden"}>
          {!isSupabaseConfigured ? (
            <div className="text-center py-16 max-w-md mx-auto space-y-2">
              <p className="text-fg-secondary text-sm font-medium">
                Supabase isn&apos;t configured yet
              </p>
              <p className="text-fg-muted text-sm">
                Set{" "}
                <code className="text-fg-secondary">VITE_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="text-fg-secondary">
                  VITE_SUPABASE_ANON_KEY
                </code>{" "}
                in your <code className="text-fg-secondary">.env</code> file
                to enable ratings and cross-device sync.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-center text-red-600 dark:text-red-400 text-sm">
                  Couldn&apos;t sync with the server. Your last known ratings
                  are shown below.
                </p>
              )}

              <section className="rounded-2xl bg-gradient-to-br from-amber-400/15 via-surface to-surface border border-amber-400/20 p-6 sm:p-8 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-fg mb-1">
                    Not sure what to watch?
                  </h2>
                  <p className="text-sm text-fg-secondary">
                    Tell us what you&apos;re streaming and we&apos;ll pick
                    something for tonight.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWatchTonightOpen(true)}
                  className="shrink-0 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-full px-6 py-3 transition-colors cursor-pointer"
                >
                  Watch Tonight
                </button>
              </section>

              {!loading && (
                <RewatchReminder
                  ratedMovies={ratedMovies}
                  onRate={rateMovie}
                  onOpen={openMovie}
                  onAddToList={setAddToListMovie}
                />
              )}

              <RecommendationsSection
                ratedMovies={ratedMovies}
                ratingsLoading={loading}
                services={services}
                onServicesChange={setServices}
                onRate={rateMovie}
                onOpen={openMovie}
                dismissedIds={dismissedIds}
                onDismissMovie={dismissMovie}
                onAddToList={setAddToListMovie}
              />

              <section>
                <h2 className="text-lg font-medium mb-4 text-fg-secondary">
                  Your Rated Movies
                </h2>
                {loading ? (
                  <PosterGridSkeleton />
                ) : (
                  <RatedMoviesGrid
                    movies={list}
                    onRate={rateMovie}
                    onOpen={openMovie}
                    onRemove={(movie) => rateMovie(movie, 0)}
                    onAddToList={setAddToListMovie}
                  />
                )}
              </section>
            </>
          )}
        </div>

        <div className={activeTab === "theaters" ? "" : "hidden"}>
          <section>
            <h2 className="text-lg font-medium mb-4 text-fg-secondary">
              In Theaters
            </h2>
            <InTheatersSection
              ratedMovies={ratedMovies}
              onRate={rateMovie}
              onOpen={openMovie}
              onAddToList={setAddToListMovie}
            />
          </section>
        </div>

        <div className={activeTab === "new" ? "" : "hidden"}>
          <section>
            <h2 className="text-lg font-medium mb-1 text-fg-secondary">
              New Releases
            </h2>
            <NewReleasesSection
              ratedMovies={ratedMovies}
              onRate={rateMovie}
              onOpen={openMovie}
              services={services}
              onServicesChange={setServices}
              onAddToList={setAddToListMovie}
            />
          </section>
        </div>

        <div className={activeTab === "stats" ? "" : "hidden"}>
          <section>
            <h2 className="text-lg font-medium mb-4 text-fg-secondary">
              Your Stats
            </h2>
            <StatsSection
              ratedMovies={ratedMovies}
              isPro={isPro}
              onGoToSettings={() => handleTabChange("settings")}
            />
          </section>
        </div>

        <div className={activeTab === "lists" ? "" : "hidden"}>
          <section>
            <h2 className="text-lg font-medium mb-4 text-fg-secondary">
              My Lists
            </h2>
            <MyListsSection
              lists={lists}
              moviesById={moviesById}
              ratedMovies={ratedMovies}
              onRate={rateMovie}
              onOpen={openMovie}
              isPro={isPro}
              onGoToSettings={() => handleTabChange("settings")}
              onCreateList={createList}
              onRenameList={renameList}
              onDeleteList={deleteList}
              onRemoveMovieFromList={removeMovieFromList}
            />
          </section>
        </div>

        <div className={activeTab === "settings" ? "" : "hidden"}>
          <SettingsTab
            userId={userId}
            email={email}
            isAnonymous={isAnonymous}
            linkEmail={linkEmail}
            resendLinkEmail={resendLinkEmail}
            services={services}
            onServicesChange={setServices}
            isPro={isPro}
            onIsProChange={setIsPro}
            earlyAccess={earlyAccess}
            onEarlyAccessChange={setEarlyAccess}
          />
        </div>
      </main>

      <TMDBAttribution />

      {openMovieId && (
        <MovieDetail
          movieId={openMovieId}
          rating={ratedMovies[openMovieId]?.rating ?? 0}
          reason={openMovieReason}
          onRate={rateMovie}
          onClose={() => {
            setOpenMovieId(null);
            setOpenMovieReason(null);
          }}
          onAddToList={setAddToListMovie}
        />
      )}

      {watchTonightOpen && (
        <WatchTonightModal
          ratedMovies={ratedMovies}
          services={services}
          onRate={rateMovie}
          onClose={() => setWatchTonightOpen(false)}
          dismissedIds={dismissedIds}
        />
      )}

      {addToListMovie && (
        <AddToListModal
          movie={addToListMovie}
          isPro={isPro}
          lists={lists}
          onCreateList={createList}
          onAddMovieToList={addMovieToList}
          onRemoveMovieFromList={removeMovieFromList}
          onClose={() => setAddToListMovie(null)}
          onGoToSettings={() => {
            setAddToListMovie(null);
            handleTabChange("settings");
          }}
        />
      )}
    </div>
  );
}
