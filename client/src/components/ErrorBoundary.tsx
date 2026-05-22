import React from 'react';

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: React.ErrorInfo) { console.error(err, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-brand-green flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-amiri text-3xl text-brand-gold mb-2">نَظِيرَة</p>
          <h2 className="text-lg font-semibold text-brand-cream mb-2">Something went wrong</h2>
          <p className="text-sm text-white/60 mb-4">Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-gold text-brand-green px-5 py-2 rounded-full font-semibold text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
}
