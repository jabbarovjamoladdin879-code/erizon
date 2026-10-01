import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { translate } from '@/i18n';
import { useUiStore } from '@/store/uiStore';

interface Props {
  children: ReactNode;
  /** Qiymat o'zgarganda (masalan, sahifa manzili) xato holati tozalanadi */
  resetKey?: string;
}

interface State {
  hasError: boolean;
}

/** Biror komponent xato bersa butun sayt yiqilmaydi — chiroyli xato sahifasi ko'rsatiladi */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kelajakda: xatoni monitoring xizmatiga (masalan, Sentry) yuborish
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const lang = useUiStore.getState().lang;
    const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
    return (
      <div className="container-page grid min-h-[60vh] place-items-center py-16" role="alert">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">{t('error.title')}</h1>
          <p className="muted mt-2">{t('error.text')}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 transition hover:bg-brand-700 px-5 text-sm font-semibold text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('error.retry')}
            </button>
            <a
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:border-brand-500 dark:border-slate-700"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              {t('error.home')}
            </a>
          </div>
        </div>
      </div>
    );
  }
}
