import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/features/auth/use-auth';

export function Landing() {
  const { user } = useAuth();
  const cta = user ? { to: '/app', label: 'Open app' } : { to: '/login', label: 'Login' };

  return (
    <div className="flex min-h-svh flex-col bg-cream text-ink">
      <header className="flex items-center justify-between border-b border-ink/8 px-8 py-4">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-serif text-[15px] font-semibold tracking-[-0.03em]">Luman</span>
        </div>

        <Link
          to={cta.to}
          className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-cream transition-all hover:opacity-80 active:scale-[0.97]"
        >
          {cta.label}
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-28 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-7 text-[11px] font-medium tracking-[0.18em] text-ink/40 uppercase"
        >
          Dataset generation · redefined
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif leading-none font-semibold tracking-[-0.03em]"
          style={{ fontSize: 'clamp(3.2rem, 9vw, 7rem)' }}
        >
          Create However
          <br />
          You Like.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-6 max-w-[400px] text-[15px] leading-relaxed text-ink/55"
        >
          Turn your documents into high-quality, human-reviewed LLM fine-tune datasets — your format, your rules.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          className="mt-10"
        >
          <Link
            to={cta.to}
            className="inline-block rounded-xl bg-ink px-9 py-3.5 text-sm font-medium text-cream transition-all hover:opacity-85 active:scale-[0.97]"
          >
            Get started →
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
