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
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <Title className="text-xl font-bold tracking-tight">{title}</Title>
      {text && <p className="muted mt-1 max-w-md text-sm">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
