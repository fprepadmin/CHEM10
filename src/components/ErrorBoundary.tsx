import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Atom } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in CHEM10 AI:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2 text-cyan-400">
                <Atom className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xs font-bold uppercase tracking-widest">CHEM10 AI Portal</span>
              </div>
              <h2 className="text-xl font-black text-white">Đã xảy ra sự cố hiển thị</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Hệ thống gặp sự cố tải trang dữ liệu. Bạn có thể nhấn nút "Thử lại" bên dưới để làm mới phiên làm việc.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-950/80 border border-slate-700/60 rounded-xl text-left font-mono text-[11px] text-red-300 max-h-28 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
