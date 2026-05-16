import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface-base flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-sm text-foreground-muted mb-4">{this.state.error.message}</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary text-sm px-4 py-2"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
