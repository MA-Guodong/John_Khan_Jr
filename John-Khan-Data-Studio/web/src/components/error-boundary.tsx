import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('页面渲染出错', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">Something went wrong</p>
          <h1 className="font-serif text-2xl font-semibold text-ink">页面出了点问题</h1>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">
            刷新一下通常就能解决。如果问题持续出现，请检查后端服务是否正常。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
