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
  if (!email)                             errors.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email))  errors.email    = 'Enter a valid email';
  if (!password)                          errors.password = 'Password is required';
  return errors;
}

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
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
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
    <div className="min-h-svh grid lg:grid-cols-2 bg-canvas">
      {/* ── Left: brand hero ───────────────────────────────────── */}
      <HeroPanel />

      {/* ── Right: sign-in ─────────────────────────────────────── */}
      <div className="relative flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="w-full max-w-[380px] flex flex-col gap-8"
        >
          {/* Brand mark — only shown here on small screens (hero is hidden) */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <BrandGlyph />
            <h1 className="text-2xl font-semibold tracking-tight font-serif text-gradient">
              SynthQA
            </h1>
          </div>

          <div className="bg-window border border-edge rounded-lg p-7 flex flex-col gap-5 shadow-lg">
            <div>
              <h2 className="text-base font-semibold text-fg">Sign in</h2>
              <p className="text-xs text-muted mt-0.5">Enter your credentials to continue</p>
            </div>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-danger/15 border border-danger/20 rounded-sm px-3 py-2.5"
              >
                <p className="text-xs text-danger">{errors.general}</p>
              </motion.div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} noValidate className="flex flex-col gap-4">
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

              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted">
            Access is by invitation only.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Hero panel (left half on lg+) ──────────────────────────── */
function HeroPanel() {
  const lines = ['Create', 'however', 'you like.'];

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-edge px-14 py-12 bg-deep">
      {/* Ambient gradient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -top-24 -left-16 h-96 w-96 rounded-full bg-accent/25 blur-[120px]" />
        <div className="animate-drift absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-iris/20 blur-[120px]" style={{ animationDelay: '-6s' }} />
        <div className="animate-drift absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-coral/15 blur-[120px]" style={{ animationDelay: '-12s' }} />
      </div>

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative flex items-center gap-2.5"
      >
        <BrandGlyph />
        <span className="text-sm font-semibold tracking-tight text-fg font-serif">SynthQA</span>
      </motion.div>

      {/* Headline */}
      <div className="relative">
        <h1 className="font-serif font-semibold leading-[1.02] tracking-tight text-[clamp(3rem,6vw,5rem)]">
          {lines.map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.12 }}
              className="block text-gradient"
            >
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.55 }}
          className="mt-6 max-w-sm text-sm leading-relaxed text-soft"
        >
          Turn your documents into high-quality, human-reviewed datasets.
          Generate question–answer pairs your way, then keep the ones worth keeping.
        </motion.p>
      </div>

      {/* Footer tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="relative text-xs text-muted"
      >
        Human-in-the-loop dataset generation
      </motion.p>
    </div>
  );
}

function BrandGlyph() {
  return (
    <div className="w-11 h-11 rounded-md flex items-center justify-center bg-accent/15 border border-accent/25 shrink-0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="var(--color-accent)" strokeWidth="1.5" />
        <line x1="7" y1="7"  x2="13" y2="7"  stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="10" x2="13" y2="10" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="13" x2="11" y2="13" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="18" cy="17" r="4" fill="var(--color-deep)" stroke="var(--color-coral)" strokeWidth="1.5" />
        <text x="18" y="20.5" textAnchor="middle" fontSize="5" fontFamily="var(--font-mono)" fill="var(--color-coral)" fontWeight="600">QA</text>
      </svg>
    </div>
  );
}
