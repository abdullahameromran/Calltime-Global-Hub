import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  Hotel,
  LayoutDashboard,
  Menu,
  Plane,
  QrCode,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';

type View = 'overview' | 'people' | 'movements' | 'accreditation';
type PersonStatus = 'Ready' | 'Review' | 'Missing';

type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  zone: string;
  status: PersonStatus;
  next: string;
  accent: string;
};

type Movement = {
  id: string;
  type: 'Flight' | 'Ground' | 'Hotel';
  title: string;
  detail: string;
  time: string;
  status: 'On time' | 'Boarding' | 'Attention';
  owner: string;
};

const people: Person[] = [
  { id: 'p-01', name: 'Nadia Al-Harbi', initials: 'NA', role: 'Tour manager', company: 'Horizon Live', zone: 'All production', status: 'Ready', next: 'Driver 04 · 16:25', accent: 'coral' },
  { id: 'p-02', name: 'Rami Haddad', initials: 'RH', role: 'Artist liaison', company: 'Desert Sound', zone: 'Artist village', status: 'Ready', next: 'Briefing · 17:00', accent: 'ochre' },
  { id: 'p-03', name: 'Sofia Karim', initials: 'SK', role: 'Lighting director', company: 'Northline Touring', zone: 'Backstage', status: 'Review', next: 'Badge photo · 16:45', accent: 'blue' },
  { id: 'p-04', name: 'Marcus Bell', initials: 'MB', role: 'Transport lead', company: 'Route 11', zone: 'Transport', status: 'Ready', next: 'Fleet check · 15:30', accent: 'teal' },
  { id: 'p-05', name: 'Lena Ortiz', initials: 'LO', role: 'Catering supplier', company: 'Palm & Salt', zone: 'Vendor village', status: 'Missing', next: 'Insurance cert', accent: 'plum' },
  { id: 'p-06', name: 'Youssef Mansour', initials: 'YM', role: 'Security supervisor', company: 'Gatehouse MENA', zone: 'All access', status: 'Ready', next: 'Gate walk · 16:10', accent: 'slate' },
  { id: 'p-07', name: 'Maya Chen', initials: 'MC', role: 'Content producer', company: 'Frame Theory', zone: 'Media compound', status: 'Review', next: 'Media pass · 17:30', accent: 'rose' },
  { id: 'p-08', name: 'Theo James', initials: 'TJ', role: 'Guest experience', company: 'Desert Sound', zone: 'Hospitality', status: 'Ready', next: 'Doors · 17:30', accent: 'green' },
];

const movements: Movement[] = [
  { id: 'm-01', type: 'Flight', title: 'QRH 204 · London → Riyadh', detail: 'Terminal 4 · 04 tour party', time: '15:40', status: 'On time', owner: 'Horizon Live' },
  { id: 'm-02', type: 'Ground', title: 'Artist hotel → site', detail: 'Vehicle 04 · 6 seats · Gate C', time: '16:25', status: 'Boarding', owner: 'Marcus Bell' },
  { id: 'm-03', type: 'Hotel', title: 'Al Masmak check-in', detail: '18 rooms · artist party', time: '16:00', status: 'Attention', owner: 'Front desk' },
  { id: 'm-04', type: 'Ground', title: 'Supplier load-in window', detail: 'Dock B → vendor village', time: '16:45', status: 'On time', owner: 'Palm & Salt' },
  { id: 'm-05', type: 'Flight', title: 'SV 1128 · Jeddah → Riyadh', detail: 'Terminal 2 · 12 production', time: '17:10', status: 'On time', owner: 'Production' },
];

const navItems: { id: View; label: string; icon: LucideIcon; count?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'people', label: 'People', icon: UsersRound, count: '1,284' },
  { id: 'movements', label: 'Movements', icon: Truck, count: '24' },
  { id: 'accreditation', label: 'Accreditation', icon: QrCode, count: '07' },
];

const bars = [38, 52, 48, 68, 61, 77, 73, 86, 79, 91, 88, 96];

function StatusPill({ status }: { status: PersonStatus | Movement['status'] }) {
  const tone = status === 'Ready' || status === 'On time' ? 'ready' : status === 'Review' || status === 'Boarding' ? 'review' : 'missing';
  return <span className={`status-pill ${tone}`}><i />{status}</span>;
}

function Dashboard() {
  const [view, setView] = useState<View>('overview');
  const [query, setQuery] = useState('');
  const [personFilter, setPersonFilter] = useState<'All' | PersonStatus>('All');
  const [selected, setSelected] = useState<Person | Movement | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const filteredPeople = useMemo(() => people.filter((person) => {
    const matchesFilter = personFilter === 'All' || person.status === personFilter;
    const needle = query.trim().toLowerCase();
    return matchesFilter && (!needle || `${person.name} ${person.role} ${person.company} ${person.zone}`.toLowerCase().includes(needle));
  }), [personFilter, query]);

  const navigate = (nextView: View) => {
    setView(nextView);
    setMobileNavOpen(false);
    setSelected(null);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  return (
    <div className="dashboard-page" data-testid="page-dashboard">
      <aside className={`dashboard-sidebar ${mobileNavOpen ? 'is-open' : ''}`} aria-label="Workspace navigation">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">ct</span>
          <span>calltime</span>
          <span className="brand-dot" />
        </div>
        <div className="workspace-switcher">
          <span className="mono-label">Workspace</span>
          <button type="button" onClick={() => setEventOpen((open) => !open)} data-testid="button-workspace-selector">
            <span><b>Desert Sound</b><small>Day 02 · Riyadh</small></span><ChevronDown size={15} />
          </button>
          {eventOpen && <div className="event-menu"><button type="button" onClick={() => { setEventOpen(false); showNotice('Desert Sound / Day 02 is already active'); }}><span>Desert Sound / Day 02</span><Check size={14} /></button><button type="button" onClick={() => { setEventOpen(false); showNotice('Demo event selector — no events changed'); }}><span>Desert Sound / Day 01</span></button></div>}
        </div>
        <nav className="dashboard-nav">
          <span className="mono-label nav-heading">Command center</span>
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <button className={`dashboard-nav-item ${view === id ? 'active' : ''}`} type="button" onClick={() => navigate(id)} key={id} data-testid={`button-nav-${id}`}>
              <Icon size={17} strokeWidth={1.7} /><span>{label}</span>{count && <small>{count}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sync-card"><span className="sync-light" /><span><b>Live workspace</b><small>Last sync 14:32 GST</small></span><ArrowUpRight size={14} /></div>
          <a className="back-site" href="/" data-testid="link-back-site"><ArrowLeft size={15} /> Back to site</a>
          <div className="profile-chip"><span className="profile-avatar">AK</span><span><b>Amal Khan</b><small>Operations lead</small></span><ChevronRight size={14} /></div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="mobile-menu-trigger" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Open workspace navigation" data-testid="button-open-dashboard-nav">{mobileNavOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="topbar-context"><span className="live-kicker"><i /> Live event workspace</span><span className="topbar-divider" /><span>18 Oct 2025</span></div>
          <div className="topbar-actions"><button type="button" className="icon-button" aria-label="Notifications" onClick={() => showNotice('You are all caught up')} data-testid="button-notifications"><Bell size={17} /><i /></button><button className="topbar-avatar" type="button" onClick={() => showNotice('Profile settings are available in the full product')} data-testid="button-profile">AK</button></div>
        </header>

        <div className="mobile-nav-scroll" aria-label="Mobile workspace navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button className={view === id ? 'active' : ''} type="button" onClick={() => navigate(id)} key={id} data-testid={`button-mobile-nav-${id}`}><Icon size={15} />{label}</button>)}
        </div>

        <div className="dashboard-content">
          <div className="dashboard-page-heading">
            <div><span className="mono-label">Desert Sound / Day 02</span><h1>{view === 'overview' ? 'Good afternoon, Amal.' : navItems.find((item) => item.id === view)?.label}</h1><p>{view === 'overview' ? 'Here is the operational picture for today’s gates.' : view === 'people' ? 'Every person, role and access requirement in one place.' : view === 'movements' ? 'The next arrivals, transfers and room keys at a glance.' : 'Credential readiness across the people picture.'}</p></div>
            <div className="heading-actions"><button className="date-button" type="button" onClick={() => setEventOpen((open) => !open)} data-testid="button-date-selector"><CalendarDays size={15} /><span>18 Oct 2025</span><ChevronDown size={14} /></button><button className="quiet-action" type="button" onClick={() => showNotice('Brief export prepared for download')} data-testid="button-export"><FileCheck2 size={15} /> Export brief</button></div>
          </div>

          {view === 'overview' && <Overview onNavigate={navigate} onSelect={setSelected} showNotice={showNotice} />}
          {view === 'people' && <PeopleView query={query} setQuery={setQuery} filter={personFilter} setFilter={setPersonFilter} people={filteredPeople} onSelect={setSelected} />}
          {view === 'movements' && <MovementsView onSelect={setSelected} showNotice={showNotice} />}
          {view === 'accreditation' && <AccreditationView showNotice={showNotice} />}
        </div>
      </main>

      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onAction={() => { setSelected(null); showNotice('Update noted in this demo workspace'); }} />}
      {notice && <div className="dashboard-toast" role="status" data-testid="status-dashboard-toast"><Check size={15} />{notice}</div>}
    </div>
  );
}

function Overview({ onNavigate, onSelect, showNotice }: { onNavigate: (view: View) => void; onSelect: (item: Person | Movement) => void; showNotice: (message: string) => void }) {
  return (
    <div className="dashboard-stack">
      <section className="metric-grid" aria-label="Readiness metrics">
        <article className="metric-card metric-primary"><div className="metric-head"><span className="mono-label">Overall readiness</span><ShieldCheck size={18} /></div><strong>86<span>%</span></strong><div className="metric-progress"><i style={{ width: '86%' }} /></div><p><b>+4.8%</b> from yesterday · on track for gates</p></article>
        <article className="metric-card"><div className="metric-head"><span className="mono-label">People in view</span><UsersRound size={17} /></div><strong>1,284</strong><p><b className="green-text">1,104 ready</b> · 86 need a review</p><div className="mini-segments"><i style={{ width: '86%' }} /><i style={{ width: '7%' }} /><i style={{ width: '7%' }} /></div></article>
        <article className="metric-card"><div className="metric-head"><span className="mono-label">Live exceptions</span><CircleAlert size={17} /></div><strong className="coral-text">07</strong><p><b className="coral-text">3 urgent</b> · 4 before doors</p><button className="metric-link" type="button" onClick={() => onNavigate('people')} data-testid="button-view-exceptions">Review exceptions <ChevronRight size={13} /></button></article>
        <article className="metric-card"><div className="metric-head"><span className="mono-label">Accreditation</span><QrCode size={17} /></div><strong>92<span>%</span></strong><p><b className="green-text">1,182 scans ready</b> · 102 in review</p><button className="metric-link" type="button" onClick={() => onNavigate('accreditation')} data-testid="button-view-accreditation">Open badge desk <ChevronRight size={13} /></button></article>
      </section>

      <section className="signal-grid">
        <article className="panel signal-panel"><div className="panel-heading"><div><span className="mono-label">Readiness signal</span><h2>Momentum is holding.</h2></div><span className="panel-range">LAST 12 HOURS <ChevronDown size={12} /></span></div><div className="bar-chart" aria-label="Readiness trend chart">{bars.map((height, index) => <div className="bar-column" key={height + index}><div className="bar-value" style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }} /><span>{index % 3 === 0 ? `${String(4 + index).padStart(2, '0')}:00` : ''}</span></div>)}</div><div className="chart-foot"><span><i className="legend-dot coral" /> Readiness score</span><span>Now <b>86%</b></span></div></article>
        <article className="panel signal-panel"><div className="panel-heading"><div><span className="mono-label">Next on the clock</span><h2>Four handoffs soon.</h2></div><button className="text-action" type="button" onClick={() => onNavigate('movements')} data-testid="button-view-movements">View all <ArrowUpRight size={14} /></button></div><div className="next-list">{movements.slice(0, 4).map((movement, index) => <button className="next-row" type="button" onClick={() => onSelect(movement)} key={movement.id} data-testid={`button-next-movement-${index}`}><span className={`movement-icon ${movement.type.toLowerCase()}`}>{movement.type === 'Flight' ? <Plane size={15} /> : movement.type === 'Hotel' ? <Hotel size={15} /> : <CarFront size={15} />}</span><span><b>{movement.title}</b><small>{movement.detail}</small></span><span className="next-time"><b>{movement.time}</b><small>{movement.status}</small></span></button>)}</div></article>
      </section>

      <section className="lower-grid"><article className="panel activity-panel"><div className="panel-heading"><div><span className="mono-label">Operations feed</span><h2>What changed recently.</h2></div><button className="text-action" type="button" onClick={() => showNotice('Command log is up to date')} data-testid="button-command-log">Command log <ArrowUpRight size={14} /></button></div><div className="activity-list">{[['NA', 'Nadia Al-Harbi', 'confirmed driver handoff', '2 min ago', 'coral'], ['MB', 'Marcus Bell', 'marked Vehicle 04 boarding', '11 min ago', 'teal'], ['SK', 'Sofia Karim', 'needs badge photo review', '18 min ago', 'blue'], ['DS', 'Desert Sound', 'updated Gate C access window', '26 min ago', 'ochre']].map(([initials, name, action, time, color], index) => <button className="activity-row" type="button" onClick={() => showNotice(`${name} · ${action}`)} key={name} data-testid={`button-activity-${index}`}><span className={`activity-avatar ${color}`}>{initials}</span><span><b>{name}</b> {action}<small>{time}</small></span><ChevronRight size={14} /></button>)}</div></article><article className="panel readiness-panel"><div className="panel-heading"><div><span className="mono-label">Team readiness</span><h2>By operating lane.</h2></div><SlidersHorizontal size={16} /></div><div className="lane-list">{[['Artist parties', '96%', '118 / 123', 'ready'], ['Production', '89%', '792 / 888', 'ready'], ['Suppliers', '71%', '84 / 119', 'review'], ['Guests & media', '82%', '110 / 134', 'review']].map(([label, score, count, tone], index) => <div className="lane-row" key={label}><div><b>{label}</b><span>{count}</span></div><strong className={tone === 'review' ? 'coral-text' : ''}>{score}</strong><div className="lane-track"><i style={{ width: score }} /></div></div>)}</div></article></section>
    </div>
  );
}

function PeopleView({ query, setQuery, filter, setFilter, people: filtered, onSelect }: { query: string; setQuery: (value: string) => void; filter: 'All' | PersonStatus; setFilter: (value: 'All' | PersonStatus) => void; people: Person[]; onSelect: (person: Person) => void }) {
  return <div className="view-stack"><div className="toolbar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, roles or companies" aria-label="Search people" data-testid="input-search-people" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')} data-testid="button-clear-search"><X size={14} /></button>}</label><div className="filter-group" role="group" aria-label="Filter people by status">{(['All', 'Ready', 'Review', 'Missing'] as const).map((status) => <button className={filter === status ? 'active' : ''} type="button" onClick={() => setFilter(status)} key={status} data-testid={`button-filter-${status.toLowerCase()}`}>{status}{status !== 'All' && <span>{people.filter((person) => person.status === status).length}</span>}</button>)}</div><button className="quiet-action filter-button" type="button" data-testid="button-people-filters"><SlidersHorizontal size={15} /> Filters</button></div><div className="table-panel"><div className="table-meta"><span className="mono-label">{filtered.length} of 1,284 people</span><span className="table-updated"><i /> Data refreshed 2 min ago</span></div>{filtered.length ? <div className="people-table" role="table"><div className="people-table-head" role="row"><span>Person</span><span>Role / company</span><span>Access zone</span><span>Next handoff</span><span>Status</span><span /></div>{filtered.map((person, index) => <button className="people-row" type="button" role="row" onClick={() => onSelect(person)} key={person.id} style={{ animationDelay: `${index * 35}ms` }} data-testid={`button-person-${person.id}`}><span className="person-cell"><i className={`person-avatar ${person.accent}`}>{person.initials}</i><b>{person.name}</b></span><span className="role-cell"><b>{person.role}</b><small>{person.company}</small></span><span className="zone-cell">{person.zone}</span><span className="next-cell"><Clock3 size={14} />{person.next}</span><StatusPill status={person.status} /><ChevronRight className="row-chevron" size={15} /></button>)}</div> : <div className="empty-state"><Search size={21} /><h3>No people match that search.</h3><p>Try a different name, role or company.</p></div>}</div></div>;
}

function MovementsView({ onSelect, showNotice }: { onSelect: (movement: Movement) => void; showNotice: (message: string) => void }) {
  return <div className="view-stack"><div className="movement-summary"><div><span className="mono-label">Movement control</span><strong>24 active movements</strong></div><div className="movement-summary-stat"><span>Next departure</span><b>16:25</b><small>Vehicle 04 · Gate C</small></div><div className="movement-summary-stat"><span>On-time rate</span><b>94.2%</b><small>+2.1% vs yesterday</small></div></div><div className="movement-board">{movements.map((movement, index) => <button className="movement-card" type="button" onClick={() => onSelect(movement)} key={movement.id} style={{ animationDelay: `${index * 55}ms` }} data-testid={`button-movement-${movement.id}`}><div className="movement-card-top"><span className={`movement-icon large ${movement.type.toLowerCase()}`}>{movement.type === 'Flight' ? <Plane size={18} /> : movement.type === 'Hotel' ? <Hotel size={18} /> : <Truck size={18} />}</span><StatusPill status={movement.status} /></div><span className="mono-label">{movement.type} · {movement.time}</span><h2>{movement.title}</h2><p>{movement.detail}</p><div className="movement-card-foot"><span><UserRound size={13} /> {movement.owner}</span><ChevronRight size={15} /></div></button>)}</div><div className="empty-safe-note"><Check size={15} /> All movements shown are local demo data. Nothing will be persisted.</div><button className="secondary-wide" type="button" onClick={() => showNotice('Movement brief is ready in this demo workspace')} data-testid="button-movement-brief">Prepare movement brief <ArrowUpRight size={15} /></button></div>;
}

function AccreditationView({ showNotice }: { showNotice: (message: string) => void }) {
  const badges = [['Production', '792', 'ready', 'All zones'], ['Artist parties', '118', 'ready', 'Artist village'], ['Suppliers', '84', 'review', 'Vendor village'], ['Guests & media', '188', 'review', 'Hospitality + media']];
  return <div className="view-stack"><div className="accreditation-hero"><div><span className="mono-label">Badge desk / Day 02</span><h2>Ready for the first scan.</h2><p>QR credentials are prepared by access zone and role. Seven records still need a human look.</p></div><div className="qr-visual"><QrCode size={58} strokeWidth={1.2} /><span>CT / DS02</span></div></div><div className="badge-grid">{badges.map(([label, amount, tone, zone], index) => <button className="badge-card" type="button" onClick={() => showNotice(`${label} badge queue opened`)} key={label} data-testid={`button-badge-${index}`}><div className="badge-card-head"><span className="badge-icon"><QrCode size={16} /></span><span className={`badge-dot ${tone}`} /></div><strong>{amount}</strong><h3>{label}</h3><p>{zone}</p><span className="badge-card-link">{tone === 'ready' ? 'View issued badges' : 'Review queue'} <ArrowUpRight size={13} /></span></button>)}</div><div className="accreditation-bottom"><div className="panel"><div className="panel-heading"><div><span className="mono-label">Queue health</span><h2>Small list, clear owners.</h2></div><ShieldCheck size={17} /></div><div className="queue-row"><span className="queue-icon coral"><CircleAlert size={15} /></span><span><b>Sofia Karim · badge photo</b><small>Owned by Amal Khan · due 16:45</small></span><StatusPill status="Review" /></div><div className="queue-row"><span className="queue-icon ochre"><FileCheck2 size={15} /></span><span><b>Lena Ortiz · insurance certificate</b><small>Owned by supplier desk · due before load-in</small></span><StatusPill status="Missing" /></div></div><div className="scan-card"><span className="mono-label">Scan readiness</span><strong>92%</strong><div className="metric-progress"><i style={{ width: '92%' }} /></div><p>1,182 QR credentials can be scanned at gates.</p><button className="text-action" type="button" onClick={() => showNotice('Scan manifest downloaded to this demo session')} data-testid="button-download-manifest">Download scan manifest <ArrowUpRight size={13} /></button></div></div></div>;
}

function DetailPanel({ item, onClose, onAction }: { item: Person | Movement; onClose: () => void; onAction: () => void }) {
  const isPerson = 'name' in item;
  return <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="detail-panel" role="dialog" aria-label="Item details"><div className="detail-head"><span className="mono-label">{isPerson ? 'Person record' : 'Movement record'}</span><button className="icon-button detail-close" type="button" onClick={onClose} aria-label="Close details" data-testid="button-close-details"><X size={17} /></button></div>{isPerson ? <><div className="detail-person"><span className={`person-avatar ${(item as Person).accent}`}>{(item as Person).initials}</span><h2>{(item as Person).name}</h2><p>{(item as Person).role} · {(item as Person).company}</p></div><div className="detail-status"><StatusPill status={(item as Person).status} /><span>Updated 4 min ago</span></div><div className="detail-facts"><div><span>Access zone</span><b>{(item as Person).zone}</b></div><div><span>Next handoff</span><b>{(item as Person).next}</b></div><div><span>Profile ID</span><b>CT-{(item as Person).id.slice(-2)}-DS02</b></div></div></> : <><div className="detail-movement"><span className={`movement-icon large ${(item as Movement).type.toLowerCase()}`}>{(item as Movement).type === 'Flight' ? <Plane size={20} /> : (item as Movement).type === 'Hotel' ? <Hotel size={20} /> : <Truck size={20} />}</span><span className="mono-label">{(item as Movement).type} · {(item as Movement).time}</span><h2>{(item as Movement).title}</h2><p>{(item as Movement).detail}</p></div><div className="detail-facts"><div><span>Owner</span><b>{(item as Movement).owner}</b></div><div><span>Current status</span><b>{(item as Movement).status}</b></div><div><span>Event</span><b>Desert Sound / Day 02</b></div></div></>}<div className="detail-actions"><button className="button-accent" type="button" onClick={onAction} data-testid="button-detail-update">{isPerson ? 'Mark reviewed' : 'Acknowledge movement'} <Check size={15} /></button><button className="quiet-action" type="button" onClick={onClose} data-testid="button-detail-close">Close</button></div></aside></div>;
}

export default Dashboard;