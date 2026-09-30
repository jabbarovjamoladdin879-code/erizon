import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Sahifada boshqa sarlavha bo'lmasa — h1 */
  titleAs?: 'h1' | 'h2';
}

export function EmptyState({ icon: Icon, title, text, action, titleAs: Title = 'h2' }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-brand-50 to-fuchsia-50 text-brand-600 shadow-soft ring-1 ring-brand-100 dark:from-brand-950 dark:to-fuchsia-950/40 dark:text-brand-300 dark:ring-brand-900">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <Title className="text-xl font-extrabold tracking-tight">{title}</Title>
      {text && <p className="muted mt-1 max-w-md text-sm">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
