import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

function LumanMarkBlack({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-label="Luman" role="img">
      <defs>
        <mask id="lm-landing">
          <rect width="120" height="120" fill="#fff" />
          <rect x="44" y="44" width="32" height="32" rx="7" fill="#000" transform="rotate(45 60 60)" />
        </mask>
      </defs>
      <rect x="22" y="22" width="76" height="76" rx="28" fill="#16140F" mask="url(#lm-landing)" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: 'Getting Started', items: ['Quick Start', 'Installation', 'First Dataset'] },
  { label: 'Useful Links',    items: ['GitHub', 'Changelog', 'Roadmap'] },
  { label: 'Documentation',   items: ['API Reference', 'Guides', 'Examples'] },
];

function NavDropdown({ label, items }: { label: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="flex items-center gap-1 text-sm font-medium text-[#16140F]/60 hover:text-[#16140F] transition-colors py-1">
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 mt-1.5 rounded-xl border border-[#16140F]/10 shadow-lg py-1.5 min-w-[176px] z-50"
          style={{ background: '#EBE8E2' }}
        >
          {items.map(item => (
            <button
              key={item}
              className="block w-full text-left px-4 py-2 text-sm text-[#16140F]/60 hover:text-[#16140F] hover:bg-[#16140F]/6 transition-colors"
            >
              {item}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#E5DCC8', color: '#16140F' }}>

      {/* ── Navbar ── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#16140F]/8">
        <div className="flex items-center gap-2.5">
          <LumanMarkBlack size={30} />
          <span
            className="font-semibold text-[15px] tracking-tight text-[#16140F]"
            style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.03em' }}
          >
            Luman
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(n => <NavDropdown key={n.label} {...n} />)}
        </nav>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all hover:opacity-80 active:scale-[0.97]"
          style={{ background: '#16140F', color: '#E5DCC8' }}
        >
          Login
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-28">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#16140F]/40 mb-7"
        >
          Dataset generation · redefined
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-semibold leading-[1.0] tracking-tight text-[#16140F]"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(3.2rem, 9vw, 7rem)',
            letterSpacing: '-0.03em',
          }}
        >
          Create However
          <br />
          You Like.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-6 max-w-[400px] text-[15px] text-[#16140F]/55 leading-relaxed"
        >
          Turn your documents into high-quality, human-reviewed
          LLM fine-tune datasets — your format, your rules.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          onClick={() => navigate('/login')}
          className="mt-10 px-9 py-3.5 rounded-xl text-sm font-medium transition-all hover:opacity-85 active:scale-[0.97]"
          style={{ background: '#16140F', color: '#E5DCC8' }}
        >
          Get started →
        </motion.button>
      </main>
    </div>
  );
}
