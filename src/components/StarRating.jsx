import { useState } from "react";

export default function StarRating({ rating = 0, onRate, size = "sm" }) {
  const [hovered, setHovered] = useState(0);
  const dims = size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || rating) >= star;
        return (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            onMouseEnter={() => setHovered(star)}
            onClick={(e) => {
              e.stopPropagation();
              onRate(star === rating ? 0 : star);
            }}
            className="p-0 leading-none cursor-pointer"
          >
            <svg
              viewBox="0 0 20 20"
              className={`${dims} transition-colors ${
                filled ? "fill-amber-400" : "fill-black/15 dark:fill-white/20"
              }`}
            >
              <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.09.99 5.77L10 14.77l-5.18 2.68.99-5.77L1.62 7.59l5.79-.84L10 1.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
