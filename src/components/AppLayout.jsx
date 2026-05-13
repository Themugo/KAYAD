import Navbar from './Navbar';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <Navbar />
      </header>
      <main className="pt-[72px]">
        {children}
      </main>
    </div>
  );
}
