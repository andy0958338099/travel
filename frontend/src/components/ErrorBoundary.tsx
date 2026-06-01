"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 名稱（用於錯誤訊息標示哪個區塊壞掉） */
  name?: string;
  /** 自訂 fallback UI */
  fallback?: (err: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全站 ErrorBoundary — 防止子組件 throw 時整頁 crash
 * 用法：<ErrorBoundary name="景點地圖"><Map /></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // 開發環境 console.error；正式環境可換成 Sentry/Crashlytics
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(`[ErrorBoundary:${this.props.name ?? "unknown"}]`, error, info.componentStack);
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError || !this.state.error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset);
    }

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-red-800 text-sm">
              {this.props.name ? `${this.props.name} 載入失敗` : "載入失敗"}
            </h3>
            <p className="text-xs text-red-600 mt-1 break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={this.reset}
              className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
            >
              🔄 重試
            </button>
          </div>
        </div>
      </div>
    );
  }
}
