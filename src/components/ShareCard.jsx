import { useEffect, useRef, useState } from "react";
import { shareText } from "../lib/stats";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;

// Draws the shareable summary card onto an offscreen canvas — no image
// library needed, this is just gradient fills + fillText. Kept in one
// function so the on-screen preview and the downloaded PNG are pixel-for-
// pixel the same image.
function drawCard(canvas, summary) {
  const ctx = canvas.getContext("2d");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#1a1206");
  bg.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = ctx.createRadialGradient(
    CARD_WIDTH * 0.5,
    CARD_HEIGHT * 0.15,
    0,
    CARD_WIDTH * 0.5,
    CARD_HEIGHT * 0.15,
    CARD_WIDTH * 0.7
  );
  glow.addColorStop(0, "rgba(251, 191, 36, 0.25)");
  glow.addColorStop(1, "rgba(251, 191, 36, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText("MOVIEMATCH", CARD_WIDTH / 2, 140);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 76px system-ui, sans-serif";
  ctx.fillText(`${summary.label} in Movies`, CARD_WIDTH / 2, 260);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "800 220px system-ui, sans-serif";
  ctx.fillText(String(summary.count), CARD_WIDTH / 2, 560);

  ctx.fillStyle = "#d4d4d4";
  ctx.font = "500 44px system-ui, sans-serif";
  ctx.fillText(
    `film${summary.count === 1 ? "" : "s"} rated`,
    CARD_WIDTH / 2,
    620
  );

  const statY = 800;
  const colGap = 260;

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.fillText(
    summary.avgRating.toFixed(1) + "★",
    CARD_WIDTH / 2 - colGap,
    statY
  );
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "500 32px system-ui, sans-serif";
  ctx.fillText("avg rating", CARD_WIDTH / 2 - colGap, statY + 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.fillText(
    summary.topGenre ?? "—",
    CARD_WIDTH / 2 + colGap,
    statY
  );
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "500 32px system-ui, sans-serif";
  ctx.fillText("top genre", CARD_WIDTH / 2 + colGap, statY + 44);
}

export default function ShareCard({ summary }) {
  const canvasRef = useRef(null);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, summary);
  }, [summary]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moviematch-${summary.label.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText(summary));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden ring-1 ring-border max-w-xs mx-auto">
        <canvas ref={canvasRef} className="w-full h-auto block" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 text-sm font-medium bg-amber-400 hover:bg-amber-300 text-black rounded-lg py-2.5 transition-colors cursor-pointer"
        >
          Download Image
        </button>
        <button
          type="button"
          onClick={handleCopyText}
          className="flex-1 text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg py-2.5 transition-colors cursor-pointer"
        >
          {copyState === "copied"
            ? "Copied!"
            : copyState === "failed"
              ? "Couldn't copy"
              : "Copy Text"}
        </button>
      </div>
    </div>
  );
}
