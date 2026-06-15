import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/authApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email)                            errors.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email    = 'Enter a valid email';
  if (!password)                         errors.password = 'Password is required';
  return errors;
}

function LumanMark({ variant, size, maskId }: { variant: 'black' | 'white'; size: number; maskId: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-label="Luman" role="img">
      <defs>
        <mask id={maskId}>
          <rect width="120" height="120" fill="#fff" />
          <rect x="44" y="44" width="32" height="32" rx="7" fill="#000" transform="rotate(45 60 60)" />
        </mask>
      </defs>
      <rect
        x="22" y="22" width="76" height="76" rx="28"
        fill={variant === 'white' ? '#FFFFFF' : '#16140F'}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

const OUTPUT_TYPES = [
  {
    label: 'Chat',
    desc: 'Instruction tuning',
    format: 'messages · JSONL',
    preview: (
      <div className="font-mono text-[10px] space-y-1.5" style={{ color: 'rgba(229,220,200,0.45)' }}>
        <div><span style={{ color: 'rgba(229,220,200,0.28)' }}>user</span>{'  · "Explain the concept of…"'}</div>
        <div><span style={{ color: 'rgba(229,220,200,0.28)' }}>asst</span>{'  · "Sure, here is how…"'}</div>
      </div>
    ),
  },
  {
    label: 'CoT',
    desc: 'Chain of Thought',
    format: '<think> blocks',
    preview: (
      <div className="font-mono text-[10px] space-y-0.5" style={{ color: 'rgba(229,220,200,0.45)' }}>
        <div style={{ color: 'rgba(229,220,200,0.28)' }}>&lt;think&gt;</div>
        <div className="pl-3">Let me reason step by step…</div>
        <div style={{ color: 'rgba(229,220,200,0.28)' }}>&lt;/think&gt;</div>
      </div>
    ),
  },
  {
    label: 'DPO',
    desc: 'Preference pairs',
    format: 'audit trail mining',
    preview: (
      <div className="space-y-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-2.5">
          <span style={{ color: '#6db87a' }}>✓ chosen&nbsp;&nbsp;</span>
          <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(229,220,200,0.1)' }}>
            <div className="h-full rounded-full w-4/5" style={{ background: 'rgba(229,220,200,0.35)' }} />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span style={{ color: '#c47a7a' }}>✗ rejected</span>
          <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(229,220,200,0.1)' }}>
            <div className="h-full rounded-full w-2/5" style={{ background: 'rgba(229,220,200,0.18)' }} />
          </div>
        </div>
      </div>
    ),
  },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate        = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [loading,  setLoading]  = useState(false);

  if (user) {
    navigate(user.role === 'worker' ? '/worker' : '/owner', { replace: true });
    return null;
  }

  async function handleSubmit() {
    const fieldErrors = validate(email, password);
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      const { access_token } = await authApi.login({ email, password });
      login(access_token);
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      navigate(payload.role === 'worker' ? '/worker' : '/owner', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Invalid email or password';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh grid lg:grid-cols-2">

      {/* ── Left: dark panel + branding ── */}
      <div
        className="relative hidden lg:flex flex-col items-center justify-center px-12 py-16 gap-12"
        style={{ background: '#16140F' }}
      >
        {/* top-left home link */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-7 flex items-center gap-2 transition-opacity opacity-50 hover:opacity-100"
        >
          <LumanMark variant="white" size={26} maskId="lm-nav" />
          <span className="text-sm font-medium text-[#E5DCC8]" style={{ fontFamily: 'var(--font-serif)' }}>
            Luman
          </span>
        </button>

        {/* Logo lockup */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="flex flex-col items-center gap-4"
        >
          <LumanMark variant="white" size={72} maskId="lm-hero" />
          <h1
            className="text-5xl font-semibold text-[#E5DCC8]"
            style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.045em' }}
          >
            Luman
          </h1>
          <p className="text-sm text-center max-w-[260px] leading-relaxed" style={{ color: 'rgba(229,220,200,0.45)' }}>
            Turn your documents into high-quality, human-reviewed
            LLM fine-tune datasets.
          </p>
        </motion.div>

        {/* Output type cards */}
        <div className="flex flex-col gap-3 w-full max-w-[320px]">
          {OUTPUT_TYPES.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl px-4 py-3.5 flex flex-col gap-2.5"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold font-mono tracking-wide text-[#E5DCC8]">
                    {t.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(229,220,200,0.4)' }}>
                    {t.desc}
                  </span>
                </div>
                <span className="text-[9px] font-mono" style={{ color: 'rgba(229,220,200,0.25)' }}>
                  {t.format}
                </span>
              </div>
              <div className="border-t pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                {t.preview}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Right: sand panel + form ── */}
      <div
        className="flex flex-col items-center justify-center px-8 py-12"
        style={{ background: '#E5DCC8' }}
      >
        {/* mobile-only brand mark */}
        <button
          onClick={() => navigate('/')}
          className="lg:hidden flex items-center gap-2 mb-10 opacity-70 hover:opacity-100 transition-opacity"
        >
          <LumanMark variant="black" size={26} maskId="lm-mobile" />
          <span className="text-sm font-medium text-[#16140F]" style={{ fontFamily: 'var(--font-serif)' }}>
            Luman
          </span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[360px]"
        >
          {/* form card — dark on sand */}
          <div
            className="rounded-2xl px-8 py-8 flex flex-col gap-6"
            style={{ background: '#16140F' }}
          >
            <div>
              <h2 className="text-xl font-semibold text-[#E5DCC8]">Sign in</h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(229,220,200,0.4)' }}>
                Enter your credentials to continue
              </p>
            </div>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-md px-3 py-2.5"
                style={{ background: 'rgba(120,20,20,0.25)', border: '1px solid rgba(180,50,50,0.25)' }}
              >
                <p className="text-xs text-danger">{errors.general}</p>
              </motion.div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
              noValidate
              className="flex flex-col gap-4"
            >
              <FormField label="Email" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                  autoFocus
                />
              </FormField>

              <FormField label="Password" htmlFor="password" error={errors.password}>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  autoComplete="current-password"
                />
              </FormField>

              <Button type="submit" variant="ghost" size="lg" loading={loading} className="w-full mt-1 text-[#E5DCC8]/70 border-[#E5DCC8]/15 hover:text-[#E5DCC8] hover:bg-[#E5DCC8]/6 hover:border-[#E5DCC8]/25">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-xs" style={{ color: 'rgba(229,220,200,0.22)' }}>
              Access is by invitation only.
            </p>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
