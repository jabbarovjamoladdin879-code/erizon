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
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <Title className="text-lg font-bold">{title}</Title>
      {text && <p className="muted mt-1 max-w-md text-sm">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
