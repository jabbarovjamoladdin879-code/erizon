/** Shartli CSS klasslarni birlashtirish */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
