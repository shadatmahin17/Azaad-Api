// Global circular-safe JSON.stringify guard to prevent third-party/telemetry logging crashes
(function () {
  if (typeof window === 'undefined' || window.__circular_json_guard_installed__) return;
  window.__circular_json_guard_installed__ = true;
  const originalStringify = JSON.stringify;
  JSON.stringify = function (value, replacer, space) {
    try {
      return originalStringify.call(this, value, replacer, space);
    } catch (err) {
      if (
        err instanceof TypeError &&
        (err.message.includes('circular') || err.message.includes('cyclic'))
      ) {
        const seen = new WeakSet();
        const safeReplacer = function (key, val) {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '[Circular]';
            }
            seen.add(val);
          }
          if (typeof replacer === 'function') {
            return replacer.call(this, key, val);
          }
          return val;
        };
        try {
          return originalStringify.call(this, value, safeReplacer, space);
        } catch {
          return '"[Unserializable Object]"';
        }
      }
      throw err;
    }
  };
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1317] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 max-w-md mb-6">
            Azaad Music encountered an unexpected issue. Tap below to reload and continue playing.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-semibold text-sm hover:bg-cyan-300 transition-colors shadow-lg shadow-cyan-400/20"
          >
            Reload Player
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
