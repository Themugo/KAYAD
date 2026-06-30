// src/components/PageLoader.tsx
// Premium gold-accent loading state.
export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">{label}…</p>
      </div>
    </div>
  );
}
