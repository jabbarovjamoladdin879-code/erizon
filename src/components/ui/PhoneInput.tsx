import { forwardRef } from 'react';
import { formatPhoneMask } from '@/utils/phone';
import { InputField } from './Field';

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  name?: string;
}

/** Telefon raqami niqobi: +998 (90) 123-45-67 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { label, value, onChange, onBlur, error, name },
  ref,
) {
  return (
    <InputField
      ref={ref}
      label={label}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+998 (90) 123-45-67"
      maxLength={19}
      value={value}
      error={error}
      onFocus={() => {
        if (!value) onChange('+998');
      }}
      onBlur={onBlur}
      onChange={(e) => onChange(formatPhoneMask(e.target.value))}
    />
  );
});
