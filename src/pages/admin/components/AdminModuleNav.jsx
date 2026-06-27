import { NavTile } from './AdminModuleWidgets';

export default function AdminModuleNav({ links }) {
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 12 }}>
        Your Modules
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {links.map(l => <NavTile key={l.to} {...l} />)}
      </div>
    </>
  );
}
