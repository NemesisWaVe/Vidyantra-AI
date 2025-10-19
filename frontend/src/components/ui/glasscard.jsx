import { motion } from 'framer-motion';

export function GlassCard({ children, className = "", hover = true, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative backdrop-blur-2xl bg-slate-900/70 rounded-3xl shadow-xl border border-white/10 ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-950/90 rounded-3xl" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}