import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Component Tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 my-4 bg-red-500/10 border border-red-500/20 rounded-xl text-ink max-w-2xl mx-auto shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/20 text-red-500 rounded-lg shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-red-400 mb-1">
                {this.props.title || 'Đã xảy ra lỗi khi hiển thị giao diện'}
              </h3>
              <p className="text-xs text-ink/70 mb-4">
                {this.state.error?.message || 'Có lỗi bất ngờ xảy ra trong cây component React.'}
              </p>

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mb-4 text-[11px] font-mono bg-black/30 p-3 rounded border border-white/10 overflow-auto max-h-40 text-red-300">
                  <summary className="cursor-pointer text-ink/60 hover:text-ink mb-1 select-none">
                    Chi tiết dấu vết lỗi (Stack Trace)
                  </summary>
                  <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                  <pre className="whitespace-pre-wrap mt-2">{this.state.errorInfo.componentStack}</pre>
                </details>
              )}

              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử tải lại giao diện
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
