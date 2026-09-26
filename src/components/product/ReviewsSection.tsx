import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'react-router-dom';
import { PenLine, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextareaField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { StarInput, Stars } from '@/components/ui/Stars';
import { REVIEW_MAX_LENGTH } from '@/data/options';
import { getSeedDistribution } from '@/data/reviews';
import { useErrorMessage, useFieldError, useSubmitGuard } from '@/hooks/useFormHelpers';
import { useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useCurrentUser } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { toast } from '@/store/toastStore';
import type { Product, Review } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { sanitizeText } from '@/utils/sanitize';
import { reviewRequestSchema } from '@/utils/validation';
import type { z } from 'zod';

type ReviewInput = z.infer<typeof reviewRequestSchema>;

export function ReviewsSection({ product }: { product: Product }) {
  const t = useT();
  const lang = useUiStore((s) => s.lang);
  const user = useCurrentUser();
  const location = useLocation();
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const guard = useSubmitGuard(2, 60_000);
  const [sort, setSort] = useState<'new' | 'helpful'>('new');
  const [formOpen, setFormOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.reviews(product.id, sort);
      setReviews(r.reviews);
    } catch {
      setReviews([]);
    }
  }, [product.id, sort]);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  const distribution = useMemo(() => getSeedDistribution(product.rating, product.reviewsCount), [product.rating, product.reviewsCount]);
  const alreadyReviewed = reviews?.some((r) => r.mine) ?? false;

  const { handleSubmit, control, formState, reset, watch, register } = useForm<ReviewInput>({
    resolver: zodResolver(reviewRequestSchema),
    defaultValues: { rating: 0, text: '' },
  });
  const textLength = watch('text')?.length ?? 0;

  const onSubmit = handleSubmit(async (data) => {
    if (!guard()) return;
    const text = sanitizeText(data.text, REVIEW_MAX_LENGTH, { multiline: true });
    try {
      const r = await api.addReview(product.id, data.rating, text);
      setReviews((list) => [r.review, ...(list ?? [])]);
      reset({ rating: 0, text: '' });
      setFormOpen(false);
      toast.success(t('toast.reviewAdded'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const vote = async (review: Review) => {
    if (!user) {
      toast.info(t('reviews.loginToVote'));
      return;
    }
    try {
      const r = await api.voteReview(review.id);
      setReviews((list) => list?.map((x) => (x.id === review.id ? { ...x, helpful: r.helpful, votedByMe: r.voted } : x)) ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const maxDist = Math.max(1, ...distribution);

  return (
    <section className="py-8" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="section-title mb-5">
        {t('reviews.title')} <span className="muted text-base font-medium">({product.reviewsCount})</span>
      </h2>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-extrabold tracking-tight">{product.rating.toFixed(1)}</span>
              <div className="pb-1">
                <Stars value={product.rating} size="md" />
                <div className="muted text-xs">{t('reviews.basedOn', { n: product.reviewsCount })}</div>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5" aria-label={t('reviews.distribution')}>
              {distribution.map((count, i) => {
                const stars = 5 - i;
                return (
                  <li key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-3 font-semibold">{stars}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxDist) * 100}%` }} />
                    </div>
                    <span className="muted w-8 text-right tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {!user ? (
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-200"
            >
              <PenLine className="h-4 w-4" aria-hidden="true" />
              {t('reviews.loginToWrite')}
            </Link>
          ) : alreadyReviewed ? (
            <p className="muted rounded-xl bg-slate-50 p-4 text-center text-sm dark:bg-slate-800">{t('reviews.already')}</p>
          ) : !formOpen ? (
            <Button variant="secondary" block size="lg" onClick={() => setFormOpen(true)}>
              <PenLine className="h-4 w-4" aria-hidden="true" />
              {t('reviews.write')}
            </Button>
          ) : (
            <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
              <h3 className="font-bold">{t('reviews.write')}</h3>
              <Controller
                control={control}
                name="rating"
                render={({ field }) => <StarInput value={field.value} onChange={field.onChange} label={t('reviews.yourRating')} />}
              />
              {formState.errors.rating && (
                <p role="alert" className="-mt-2 text-xs font-medium text-red-600">
                  {fieldError(formState.errors.rating.message)}
                </p>
              )}
              <TextareaField
                label={t('reviews.text')}
                maxLength={REVIEW_MAX_LENGTH}
                hint={`${textLength}/${REVIEW_MAX_LENGTH}`}
                error={fieldError(formState.errors.text?.message)}
                {...register('text')}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" loading={formState.isSubmitting}>
                  {t('reviews.submit')}
                </Button>
                <Button variant="ghost" onClick={() => setFormOpen(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div>
          <div className="mb-3 flex gap-2" role="group" aria-label={t('catalog.sort')}>
            <button type="button" className={cn('chip', sort === 'new' && 'chip-active')} aria-pressed={sort === 'new'} onClick={() => setSort('new')}>
              {t('reviews.sortNew')}
            </button>
            <button type="button" className={cn('chip', sort === 'helpful' && 'chip-active')} aria-pressed={sort === 'helpful'} onClick={() => setSort('helpful')}>
              {t('reviews.sortHelpful')}
            </button>
          </div>
          {reviews === null ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="muted card p-6 text-center text-sm">{t('reviews.empty')}</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200" aria-hidden="true">
                        {r.author.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">
                          {r.author} {r.mine && <span className="muted text-xs font-normal">({t('reviews.you')})</span>}
                        </div>
                        <div className="muted text-xs">{formatDate(r.createdAt, lang)}</div>
                      </div>
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{r.text}</p>
                  <button
                    type="button"
                    onClick={() => void vote(r)}
                    disabled={r.mine}
                    aria-pressed={!!r.votedByMe}
                    className={cn(
                      'mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                      r.votedByMe ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('reviews.helpful')} · {r.helpful}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
