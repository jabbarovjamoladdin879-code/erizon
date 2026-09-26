import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { adminErrorText } from '@/hooks/useAdminQuery';
import { useSeo } from '@/hooks/useSeo';
import { api } from '@/services/api';
import { useAuthStore, useCurrentUser } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/** Admin uchun ikki bosqichli autentifikatsiya (TOTP: Google Authenticator, Authy va h.k.) */
export default function AdminSecurityPage() {
  useSeo('Admin — xavfsizlik');
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(adminErrorText(err));
    } finally {
      setBusy(false);
      setCode('');
    }
  };

  const start = () =>
    run(async () => {
      const r = await api.admin.totpSetup();
      setSetup({ secret: r.secret, qrDataUrl: r.qrDataUrl });
    });

  const enable = () =>
    run(async () => {
      const r = await api.admin.totpEnable(code);
      setUser(r.user);
      setSetup(null);
      toast.success('2FA yoqildi. Keyingi kirishda ilovadagi kod so\'raladi.');
    });

  const disable = () =>
    run(async () => {
      const r = await api.admin.totpDisable(code);
      setUser(r.user);
      toast.info("2FA o'chirildi");
    });

  const codeInput = (
    <InputField
      label="Ilovadagi 6 xonali kod"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      className="max-w-[220px] text-center font-mono text-lg tracking-[0.4em]"
    />
  );

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">Xavfsizlik</h1>
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          {user.totpEnabled ? <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden="true" /> : <ShieldOff className="h-7 w-7 text-amber-600" aria-hidden="true" />}
          <div>
            <h2 className="font-bold">Ikki bosqichli autentifikatsiya (2FA)</h2>
            <p className="muted text-sm">{user.totpEnabled ? 'Yoqilgan — admin panelga kirishda parol + ilova kodi talab qilinadi.' : 'Yoqilmagan. Production muhitida admin API 2FA\'siz ishlamaydi.'}</p>
          </div>
        </div>

        {user.totpEnabled ? (
          <div className="space-y-3">
            {codeInput}
            <Button variant="danger" loading={busy} disabled={code.length !== 6} onClick={() => void disable()}>2FA ni o'chirish</Button>
          </div>
        ) : setup ? (
          <div className="space-y-4">
            <ol className="muted list-decimal space-y-1 pl-5 text-sm">
              <li>Telefoningizda Google Authenticator (yoki Authy, Microsoft Authenticator) ilovasini oching.</li>
              <li>Quyidagi QR kodni skanerlang yoki kalitni qo'lda kiriting.</li>
              <li>Ilova ko'rsatgan 6 xonali kodni kiriting.</li>
            </ol>
            <img src={setup.qrDataUrl} alt="2FA QR kodi" width={220} height={220} className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700" />
            <p className="text-sm">
              Kalit: <code className="break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-800">{setup.secret}</code>
            </p>
            {codeInput}
            <Button loading={busy} disabled={code.length !== 6} onClick={() => void enable()}>Tasdiqlash va yoqish</Button>
          </div>
        ) : (
          <Button loading={busy} onClick={() => void start()}>2FA ni sozlash</Button>
        )}
      </section>
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="font-bold">Himoya choralari (serverda)</h2>
        <ul className="muted list-disc space-y-1 pl-5">
          <li>Parollar Argon2id bilan xeshlanadi; 5 ta noto'g'ri urinishdan so'ng akkaunt 15 daqiqaga bloklanadi.</li>
          <li>Sessiyalar HttpOnly, Secure, SameSite=Strict cookie'larda; refresh token rotatsiyasi va o'g'irlikni aniqlash.</li>
          <li>Har bir admin amali audit jurnaliga yoziladi.</li>
          <li>2FA siri bazada AES-256-GCM bilan shifrlangan; bitta kodni qayta ishlatib bo'lmaydi.</li>
        </ul>
      </section>
    </div>
  );
}
