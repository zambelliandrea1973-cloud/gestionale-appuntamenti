import { Component, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught error:", error.message, info.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold text-gray-700">Qualcosa è andato storto.</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded-md text-sm"
            onClick={() => window.location.reload()}
          >
            Ricarica la pagina
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
