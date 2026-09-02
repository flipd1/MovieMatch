import { useState } from "react";

// Global modal opened from a MovieCard's "+" button or MovieDetail's "Add
// to List" button — one modal shared by every surface a movie can be added
// from, rather than an inline popover per card (which would get clipped by
// each card's overflow-hidden poster frame).
export default function AddToListModal({
  movie,
  isPro,
  lists,
  onCreateList,
  onAddMovieToList,
  onRemoveMovieFromList,
  onClose,
  onGoToSettings,
}) {
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  if (!movie) return null;

  const handleToggle = (list) => {
    if (list.movieIds.includes(movie.id)) {
      onRemoveMovieFromList(list.id, movie.id);
    } else {
      onAddMovieToList(list.id, movie);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name || creating) return;
    setCreating(true);
    const listId = await onCreateList(name);
    setCreating(false);
    setNewListName("");
    if (listId) onAddMovieToList(listId, movie);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {!isPro ? (
          <div className="text-center space-y-4 py-2">
            <span className="inline-flex items-center gap-1 bg-amber-400 text-black text-xs font-bold uppercase tracking-wide rounded-full px-3 py-1">
              Pro
            </span>
            <h3 className="text-base font-semibold text-fg">
              Create custom lists
            </h3>
            <p className="text-sm text-fg-muted">
              Organize movies into your own lists — like &quot;Date
              Night&quot; or &quot;Comfort Watches&quot; — with a Pro
              account.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg py-2 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onGoToSettings}
                className="flex-1 text-sm font-medium bg-amber-400 hover:bg-amber-300 text-black rounded-lg py-2 transition-colors cursor-pointer"
              >
                Unlock Pro
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                Add to a list
              </h3>
              <p className="text-xs text-fg-muted truncate">{movie.title}</p>
            </div>

            {lists.length > 0 && (
              <ul className="space-y-1 max-h-56 overflow-y-auto">
                {lists.map((list) => {
                  const checked = list.movieIds.includes(movie.id);
                  return (
                    <li key={list.id}>
                      <label className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-fill cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(list)}
                          className="accent-amber-400 w-3.5 h-3.5"
                        />
                        <span className="text-sm text-fg flex-1 truncate">
                          {list.name}
                        </span>
                        <span className="text-xs text-fg-faint">
                          {list.movieIds.length}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name…"
                maxLength={100}
                className="flex-1 bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <button
                type="submit"
                disabled={!newListName.trim() || creating}
                className="text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg px-3.5 transition-colors cursor-pointer"
              >
                Create
              </button>
            </form>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg py-2 transition-colors cursor-pointer"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
