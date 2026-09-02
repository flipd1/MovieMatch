import { Component } from "react";

// Last-resort catch for render errors anywhere in the tree below it (a
// malformed API response, an unexpected null, etc). Without this, any
// uncaught render error unmounts the whole React tree and leaves a blank
// page — this at least gives the user a way back instead of a dead tab.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-fg-muted">
            MovieMatch hit an unexpected error. Reloading usually fixes it —
            your ratings and lists are saved and won&apos;t be affected.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-full px-6 py-2.5 transition-colors cursor-pointer"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
