import { useState } from "react";
import MovieCard from "./MovieCard";
import ProLockedPreview from "./ProLockedPreview";

function ListHeader({ list, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(list.name);

  const commitRename = () => {
    setEditing(false);
    if (draftName.trim() && draftName.trim() !== list.name) {
      onRename(list.id, draftName);
    } else {
      setDraftName(list.name);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      {editing ? (
        <input
          type="text"
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraftName(list.name);
              setEditing(false);
            }
          }}
          maxLength={100}
          className="text-lg font-medium bg-surface-muted border border-border rounded-lg px-2 py-1 text-fg focus:outline-none focus:ring-2 focus:ring-border-strong"
        />
      ) : (
        <h3 className="text-lg font-medium text-fg-secondary">
          {list.name}{" "}
          <span className="text-sm text-fg-faint font-normal">
            ({list.movieIds.length})
          </span>
        </h3>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Rename ${list.name}`}
          title="Rename list"
          className="w-8 h-8 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-fill transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current stroke-[1.5]">
            <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete "${list.name}"? This can't be undone.`)) {
              onDelete(list.id);
            }
          }}
          aria-label={`Delete ${list.name}`}
          title="Delete list"
          className="w-8 h-8 flex items-center justify-center rounded-full text-fg-muted hover:text-red-500 hover:bg-fill transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current stroke-[1.5]">
            <path d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6.5 0l.6 9.4a1.5 1.5 0 001.5 1.6h4.8a1.5 1.5 0 001.5-1.6L14.5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ListsContent({
  lists,
  moviesById,
  ratedMovies,
  onRate,
  onOpen,
  onRenameList,
  onDeleteList,
  onRemoveMovieFromList,
  onCreateList,
}) {
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name || creating) return;
    setCreating(true);
    await onCreateList(name);
    setCreating(false);
    setNewListName("");
  };

  return (
    <div className="space-y-10">
      <form onSubmit={handleCreate} className="flex gap-2 max-w-sm">
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="New list name…"
          maxLength={100}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
        />
        <button
          type="submit"
          disabled={!newListName.trim() || creating}
          className="text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg px-4 transition-colors cursor-pointer"
        >
          New List
        </button>
      </form>

      {!lists.length ? (
        <div className="text-center py-16 text-fg-muted">
          <p className="text-sm">
            No lists yet — create one above, or add a movie to a list from
            any movie card.
          </p>
        </div>
      ) : (
        lists.map((list) => {
          const movies = list.movieIds
            .map((id) => moviesById[id])
            .filter(Boolean);

          return (
            <section key={list.id}>
              <ListHeader
                list={list}
                onRename={onRenameList}
                onDelete={onDeleteList}
              />
              {movies.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {movies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      rating={ratedMovies[movie.id]?.rating ?? 0}
                      onRate={onRate}
                      onOpen={onOpen}
                      onRemoveFromList={() =>
                        onRemoveMovieFromList(list.id, movie.id)
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-fg-muted">
                  Nothing in this list yet — use the &quot;+&quot; on any
                  movie card to add one.
                </p>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

const SAMPLE_LISTS = [
  { id: "sample-1", name: "Date Night", movieIds: [] },
  { id: "sample-2", name: "Comfort Watches", movieIds: [] },
];

export default function MyListsSection({
  lists,
  moviesById,
  ratedMovies,
  onRate,
  onOpen,
  isPro,
  onGoToSettings,
  onCreateList,
  onRenameList,
  onDeleteList,
  onRemoveMovieFromList,
}) {
  if (!isPro) {
    return (
      <ProLockedPreview
        onUnlock={onGoToSettings}
        title="Create custom lists"
        description='Organize movies into your own lists — like "Date Night" or "Comfort Watches" — with a Pro account.'
      >
        <ListsContent
          lists={SAMPLE_LISTS}
          moviesById={{}}
          ratedMovies={{}}
          onRate={() => {}}
          onOpen={() => {}}
          onRenameList={() => {}}
          onDeleteList={() => {}}
          onRemoveMovieFromList={() => {}}
          onCreateList={async () => null}
        />
      </ProLockedPreview>
    );
  }

  return (
    <ListsContent
      lists={lists}
      moviesById={moviesById}
      ratedMovies={ratedMovies}
      onRate={onRate}
      onOpen={onOpen}
      onRenameList={onRenameList}
      onDeleteList={onDeleteList}
      onRemoveMovieFromList={onRemoveMovieFromList}
      onCreateList={onCreateList}
    />
  );
}
