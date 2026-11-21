import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { personalNavGroups, type PersonalSection } from './personalNav';
import PersonalSignOutButton from './PersonalSignOutButton';

type Props = { name?: string; active: PersonalSection; onSelect: (section: PersonalSection) => void; onSignOut?: () => Promise<{ ok: boolean; message?: string }> };

/** Desktop sidebar: the navigation scrolls independently while account actions remain anchored. */
export default function PersonalSidebar({ name, active, onSelect, onSignOut }: Props) {
  return (
    <aside className="hidden h-[calc(100dvh-6rem)] max-h-[900px] min-h-[24rem] self-start rounded-2xl bg-[#0A3545] p-3 text-white shadow-sm lg:sticky lg:top-24 lg:flex lg:flex-col" data-kayad-personal-sidebar="true">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-2 pb-4 pt-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#11B8A6] font-black text-[#082B40]">{String(name || 'K').slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0"><p className="truncate text-sm font-black">{name || 'My account'}</p><p className="text-[11px] text-white/60">Personal account</p></div>
      </div>
      <nav className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1" aria-label="Personal dashboard sections">
        {personalNavGroups.map((group) => (
          <div key={group.id} role="group" aria-label={group.label}>
            <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[.16em] text-white/40">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon; const current = active === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => onSelect(item.id)} aria-current={current ? 'page' : undefined}
                    className={`flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${current ? 'bg-[#11B8A6]/20 text-white shadow-[inset_3px_0_0_#12D6CB]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
                    <Icon size={17} aria-hidden="true" />{item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-3 hidden shrink-0 rounded-xl bg-white/10 p-3 text-[11px] [@media(min-height:1000px)]:block leading-5 text-white/70"><ShieldCheck size={16} className="mb-2 text-[#12D6CB]" aria-hidden="true" />One personal identity for private buying and selling. Business memberships remain separate.</div>
      <div className="mt-3 shrink-0 border-t border-white/10 pt-3">
        <PersonalSignOutButton onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
