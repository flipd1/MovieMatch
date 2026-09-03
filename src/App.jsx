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
import WelcomeServicesModal from "./components/WelcomeServicesModal";
import PasswordRecoveryModal from "./components/PasswordRecoveryModal";
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

const WELCOME_SEEN_KEY = "moviematch.seenWelcomeServices";

function PosterGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
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
    isPasswordRecovery,
    createAccount,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    dismissPasswordRecovery,
    loading: authLoading,
  } = useAuth();
  const {
    ratedMovies,
    list,
    rateMovie,
    mergeRatings,
    loading: ratingsLoading,
    error,
  } = useRatedMovies(userId);
  const hasLocalRatings = Object.keys(ratedMovies).length > 0;

  // Signing in normally REPLACES the active session, so the outgoing
  // anonymous session's ratings have to be snapshotted before that swap —
  // afterward, RLS blocks reading them under the new session's auth.uid()
  // even though the rows still exist. mergeRatings only fills in movies
  // the target account doesn't already have a rating for; it never
  // overwrites one the account already had.
  const signInAndMerge = useCallback(
    async ({ email, password }) => {
      const snapshot = ratedMovies;
      const { error: signInError, userId: newUserId } = await signIn({
        email,
        password,
      });
      if (signInError) return { error: signInError };

      if (newUserId) {
        try {
          await mergeRatings(newUserId, snapshot);
        } catch (mergeError) {
          return { error: mergeError };
        }
      }
      return { error: null };
    },
    [ratedMovies, signIn, mergeRatings]
  );
  const {
    services,
    setServices,
    loading: servicesLoading,
  } = useMyServices(userId);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
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
  const [accountFocusTarget, setAccountFocusTarget] = useState(null);
  const scrollPositions = useRef({
    discover: 0,
    theaters: 0,
    new: 0,
    stats: 0,
    lists: 0,
    settings: 0,
  });

  const loading = authLoading || ratingsLoading;

  const showWelcomeServices =
    isSupabaseConfigured &&
    !authLoading &&
    !servicesLoading &&
    services.length === 0 &&
    !welcomeDismissed;

  const dismissWelcome = useCallback(() => {
    setWelcomeDismissed(true);
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      // Best-effort — worst case the prompt reappears next visit.
    }
  }, []);

  const handleSaveWelcomeServices = useCallback(
    (selected) => {
      setServices(selected);
      dismissWelcome();
    },
    [setServices, dismissWelcome]
  );

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

  const handleHeaderSignIn = useCallback(() => {
    handleTabChange("settings");
    setAccountFocusTarget("signin");
  }, [handleTabChange]);

  const clearAccountFocusTarget = useCallback(() => {
    setAccountFocusTarget(null);
  }, []);

  useLayoutEffect(() => {
    const y = scrollPositions.current[activeTab] ?? 0;
    window.scrollTo(0, y);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-bg/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight shrink-0">
              {/* The wordmark's brand color stays fixed across themes
                  (matching the "Watch Tonight" amber-400 buttons etc.)
                  rather than using the theme-adaptive --color-accent-fg
                  variable — that variable is intentionally a darker amber
                  in light mode for readability as body text (see the
                  "Because you rated X" reason text and the Watch Tonight
                  low-match warning), which would look washed out here but
                  is the wrong tradeoff for a logo, where brand consistency
                  matters more than adapting per theme. */}
              Movie<span className="text-amber-400">Match</span>
            </h1>
            {/* Same toggle as the sm:ml-auto one below — shown here so it
                stays paired with the logo on its own row on narrow
                viewports, instead of getting flex-wrapped onto a stray
                row below the search bar (which spans full width below
                `sm`). Hidden again once the search bar has room to sit
                inline and the other copy takes over. */}
            <div className="sm:hidden flex items-center gap-3">
              {isAnonymous && (
                <button
                  type="button"
                  onClick={handleHeaderSignIn}
                  className="text-sm font-medium text-fg-muted hover:text-fg cursor-pointer"
                >
                  Sign In
                </button>
              )}
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
          <SearchBar
            ratedMovies={ratedMovies}
            onRate={rateMovie}
            onOpen={openMovie}
          />
          <div className="hidden sm:flex items-center gap-3 sm:ml-auto">
            {isAnonymous && (
              <button
                type="button"
                onClick={handleHeaderSignIn}
                className="text-sm font-medium text-fg-muted hover:text-fg cursor-pointer"
              >
                Sign In
              </button>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <TabNav
            activeTab={activeTab}
            onChange={handleTabChange}
            isPro={isPro}
          />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
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
                <h2 className="text-xl font-semibold sm:text-lg sm:font-medium mb-4 text-fg-secondary">
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
            <h2 className="text-xl font-semibold sm:text-lg sm:font-medium mb-4 text-fg-secondary">
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
            <h2 className="text-xl font-semibold sm:text-lg sm:font-medium mb-1 text-fg-secondary">
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
            <h2 className="text-xl font-semibold sm:text-lg sm:font-medium mb-4 text-fg-secondary">
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
            <h2 className="text-xl font-semibold sm:text-lg sm:font-medium mb-4 text-fg-secondary">
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
            hasLocalRatings={hasLocalRatings}
            createAccount={createAccount}
            signIn={signIn}
            signInAndMerge={signInAndMerge}
            signOut={signOut}
            requestPasswordReset={requestPasswordReset}
            services={services}
            onServicesChange={setServices}
            isPro={isPro}
            onIsProChange={setIsPro}
            earlyAccess={earlyAccess}
            onEarlyAccessChange={setEarlyAccess}
            accountFocusTarget={accountFocusTarget}
            onAccountFocusHandled={clearAccountFocusTarget}
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

      {isPasswordRecovery && (
        <PasswordRecoveryModal
          onUpdatePassword={updatePassword}
          onDismiss={dismissPasswordRecovery}
        />
      )}

      {showWelcomeServices && (
        <WelcomeServicesModal
          onSave={handleSaveWelcomeServices}
          onSkip={dismissWelcome}
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
