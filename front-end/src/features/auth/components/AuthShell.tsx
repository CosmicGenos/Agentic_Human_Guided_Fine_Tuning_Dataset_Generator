import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '@/components/brand/Logo';

const OUTPUT_TYPES = [
  {
    label: 'Chat',
    desc: 'Instruction tuning',
    format: 'messages · JSONL',
    preview: (
      <div className="space-y-1.5 font-mono text-[10px] text-cream/45">
        <div><span className="text-cream/30">user</span>{'  · "Explain the concept of…"'}</div>
        <div><span className="text-cream/30">asst</span>{'  · "Sure, here is how…"'}</div>
      </div>
    ),
  },
  {
    label: 'CoT',
    desc: 'Chain of Thought',
    format: '<think> blocks',
    preview: (
      <div className="space-y-0.5 font-mono text-[10px] text-cream/45">
        <div className="text-cream/30">&lt;think&gt;</div>
        <div className="pl-3">Let me reason step by step…</div>
        <div className="text-cream/30">&lt;/think&gt;</div>
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
          <span className="text-[#6db87a]">✓ chosen&nbsp;&nbsp;</span>
          <div className="h-1 flex-1 rounded-full bg-cream/10"><div className="h-full w-4/5 rounded-full bg-cream/35" /></div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[#c47a7a]">✗ rejected</span>
          <div className="h-1 flex-1 rounded-full bg-cream/10"><div className="h-full w-2/5 rounded-full bg-cream/20" /></div>
        </div>
      </div>
    ),
  },
];

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Split screen for public auth pages: ink brand panel (lg+) and a cream panel with a dark form card. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center gap-12 bg-ink px-12 py-16 lg:flex">
        <Link to="/" className="absolute top-6 left-7 flex items-center gap-2 opacity-50 transition-opacity hover:opacity-100">
          <Logo tone="light" size={26} />
          <span className="font-serif text-sm font-medium text-cream">Luman</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="flex flex-col items-center gap-4"
        >
          <Logo tone="light" size={72} />
          <h1 className="font-serif text-5xl font-semibold tracking-[-0.045em] text-cream">Luman</h1>
          <p className="max-w-[260px] text-center text-sm leading-relaxed text-cream/45">
            Turn your documents into high-quality, human-reviewed LLM fine-tune datasets.
          </p>
        </motion.div>

        <div className="flex w-full max-w-[320px] flex-col gap-3">
          {OUTPUT_TYPES.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/5 px-4 py-3.5"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold tracking-wide text-cream">{t.label}</span>
                  <span className="text-[10px] text-cream/40">{t.desc}</span>
                </div>
                <span className="font-mono text-[9px] text-cream/25">{t.format}</span>
              </div>
              <div className="border-t border-white/7 pt-2.5">{t.preview}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-cream px-6 py-12 sm:px-8">
        <Link to="/" className="mb-10 flex items-center gap-2 opacity-70 transition-opacity hover:opacity-100 lg:hidden">
          <Logo tone="dark" size={26} />
          <span className="font-serif text-sm font-medium text-ink">Luman</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px]"
        >
          <div className="flex flex-col gap-6 rounded-2xl bg-ink px-8 py-8 text-cream">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-cream/45">{subtitle}</p>
            </div>
            {children}
            {footer && <div className="text-center text-xs text-cream/30">{footer}</div>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Class overrides that turn the shared light inputs/buttons into the dark-card variants. */
export const darkField =
  'border-cream/15 bg-white/5 text-cream placeholder:text-cream/30 focus-visible:border-cream/40 focus-visible:ring-cream/10 aria-invalid:border-[#c47a7a]';
export const darkButton = 'w-full bg-cream text-ink hover:bg-cream/85';
export const darkLabel = 'text-cream/75';
