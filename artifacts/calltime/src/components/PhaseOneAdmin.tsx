import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileUp,
  Hotel,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Plane,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Truck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import BrandMark from "./BrandMark";
import { supabase } from "../lib/supabase";
import {
  addFlight,
  addHotel,
  addTransport,
  createEvent,
  createPersonAssignment,
  createRole,
  generatePersonalLink,
  loadWorkspace,
  parseCsv,
  updateAssignmentStatus,
  updatePersonAssignment,
  type AssignmentRecord,
  type EventRecord,
  type EventRole,
  type PersonRole,
} from "../lib/phase-one";

function dateTimeInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatCtGlobalId(id: string) {
  const compact = id.replaceAll("-", "").toUpperCase();
  return `CT-${compact.slice(0, 4)}-${compact.slice(4, 6)}`;
}

function nextCalendarDate(value: string) {
  if (!value) return "";
  const nextDay = new Date(`${value}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString().slice(0, 10);
}

function constrainFollowingDate(
  event: ChangeEvent<HTMLInputElement>,
  followingFieldName: string,
  dateOnly = false,
) {
  const following = event.currentTarget.form?.elements.namedItem(followingFieldName);
  if (!(following instanceof HTMLInputElement)) return;

  let minimum = event.currentTarget.value;
  if (dateOnly && minimum) minimum = nextCalendarDate(minimum);
  following.min = minimum;
  if (following.value && following.value < minimum) following.value = "";
}

type Workspace = {
  events: EventRecord[];
  activeEvent: EventRecord | null;
  roles: EventRole[];
  assignments: AssignmentRecord[];
};

type AdminView = "overview" | "events" | "people" | "roles" | "logistics" | "accreditation";

const roleTypes: Array<{ value: PersonRole; label: string }> = [
  { value: "artist", label: "Artist" },
  { value: "crew", label: "Crew" },
  { value: "supplier_staff", label: "Supplier staff" },
  { value: "guest", label: "Guest" },
  { value: "admin_staff", label: "Admin staff" },
];

function AdminLogin() {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const result = mode === "password"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
    setBusy(false);
    setMessage(result.error ? result.error.message : "Check your email for the secure sign-in link.");
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <a className="admin-login-brand" href="/">
          <BrandMark size={42} />
          <span>calltime <small>global</small></span>
        </a>
        <span className="admin-login-kicker"><ShieldCheck size={14} /> Secure operations workspace</span>
        <h1>Run the whole arrival from one place.</h1>
        <p>Sign in to manage people, logistics, personal links and accreditation.</p>
        <form onSubmit={submit} className="admin-login-form">
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          {mode === "password" && (
            <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
          )}
          <button className="mvp-primary" disabled={busy} type="submit">
            {busy ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
            {mode === "password" ? "Sign in" : "Send magic link"}
          </button>
        </form>
        {message && <p className="admin-login-message">{message}</p>}
        <button className="admin-mode-switch" type="button" onClick={() => setMode(mode === "password" ? "magic" : "password")}>
          {mode === "password" ? "Use a magic link instead" : "Use password instead"}
        </button>
        <a className="admin-back-link" href="/"><ArrowLeft size={14} /> Back to website</a>
      </section>
      <aside className="admin-login-aside">
        <span>PHASE 01 / LIVE OPERATIONS</span>
        <h2>People in motion.<br /><em>Perfectly timed.</em></h2>
        <div className="admin-login-points">
          <span>01 <b>Permanent CT Global IDs</b></span>
          <span>02 <b>Personal logistics links</b></span>
          <span>03 <b>QR-ready accreditation</b></span>
        </div>
      </aside>
    </main>
  );
}

export default function PhaseOneAdmin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<AssignmentRecord | null>(null);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"person" | "edit" | "role" | "event" | "logistics" | null>(null);
  const [logisticsKind, setLogisticsKind] = useState<"flight" | "transport" | "hotel">("flight");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [returnAfterRole, setReturnAfterRole] = useState<"person" | "edit" | null>(null);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = async (preferredEventId = activeEventId) => {
    setBusy(true);
    try {
      const next = await loadWorkspace(preferredEventId);
      setWorkspace(next);
      setActiveEventId(next.activeEvent?.id ?? null);
      if (selected) {
        setSelected(next.assignments.find((item) => item.id === selected.id) ?? null);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load workspace");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (session) void refresh();
    // The workspace is loaded once when authentication becomes available.
    // Event changes call refresh(id) directly to avoid duplicate requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    setDialogError("");
  }, [dialog]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (workspace?.assignments ?? []).filter((item) =>
      !needle || `${item.people.full_name} ${item.people.email ?? ""} ${item.event_roles?.label ?? ""}`.toLowerCase().includes(needle),
    );
  }, [query, workspace]);

  const run = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNotice("");
    try {
      await operation();
      setDialog(null);
      setNotice(success);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      if (dialog) setDialogError(message);
      else setNotice(message);
    } finally {
      setBusy(false);
    }
  };

  const changeView = (view: AdminView) => {
    setActiveView(view);
    setSelected(null);
    setMobileNav(false);
  };

  const selectEvent = async (eventId: string) => {
    setSelected(null);
    setNotice("");
    setActiveEventId(eventId);
    setActiveView("overview");
    setMobileNav(false);
    await refresh(eventId);
  };

  if (session === undefined) return <div className="mvp-loading"><LoaderCircle className="spin" /> Loading Calltime…</div>;
  if (!session) return <AdminLogin />;

  const event = workspace?.activeEvent;
  const assignments = workspace?.assignments ?? [];
  const readyCount = assignments.filter((item) => item.accreditations?.[0]?.status === "ready").length;
  const logisticsReadyCount = assignments.filter((item) => item.flights.length || item.ground_transport.length || item.hotel_bookings.length).length;
  const issuedCount = assignments.filter((item) => item.accreditations?.[0]?.status === "issued").length;
  const firstFlight = selected?.flights[0] as any;
  const firstTransport = selected?.ground_transport[0] as any;
  const firstHotel = selected?.hotel_bookings[0] as any;
  const viewCopy: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
    overview: { eyebrow: "LIVE EVENT / CONTROL CENTER", title: "Operations overview.", description: "A clear read on people, movement and badge readiness for the active event." },
    events: { eyebrow: "EVENT WORKSPACE / PORTFOLIO", title: "Events.", description: "Create events, see what is live and switch the entire workspace in one click." },
    people: { eyebrow: "CT GLOBAL ID / PEOPLE OPERATIONS", title: "People command.", description: "Create identities, assign roles and keep every movement attached to one person." },
    roles: { eyebrow: "EVENT SETUP / ROLE DIRECTORY", title: "Event roles.", description: "Define the artist, crew, supplier and guest roles available for this event." },
    logistics: { eyebrow: "MOVEMENT DESK / LOGISTICS", title: "Travel and stays.", description: "See missing arrangements immediately and open any profile to update its itinerary." },
    accreditation: { eyebrow: "ACCESS DESK / ACCREDITATION", title: "Badge readiness.", description: "Prepare secure personal links and QR credentials for on-site collection." },
  };
  const heading = viewCopy[activeView];

  const submitEvent = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const values = new FormData(formEvent.currentTarget);
    const startsAt = String(values.get("startsAt"));
    const endsAt = String(values.get("endsAt"));
    if (new Date(endsAt) <= new Date(startsAt)) {
      setDialogError("Event end date and time must be after the start date and time.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const created = await createEvent({
        name: String(values.get("name")), city: String(values.get("city")), venueName: String(values.get("venue")),
        startsAt, endsAt, timezone: String(values.get("timezone")),
      });
      setDialog(null);
      setActiveEventId(created.id);
      setActiveView("overview");
      setNotice("Event created and selected");
      await refresh(created.id);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to create event");
    } finally {
      setBusy(false);
    }
  };

  const submitRole = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!event) return;
    const values = new FormData(formEvent.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      await createRole(event.id, String(values.get("label")), String(values.get("roleType")) as PersonRole);
      await refresh(event.id);
      setNotice("Event role created");
      setDialog(returnAfterRole);
      setReturnAfterRole(null);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Unable to create role");
    } finally {
      setBusy(false);
    }
  };

  const submitPerson = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!event) return;
    const values = new FormData(formEvent.currentTarget);
    const role = workspace?.roles.find((item) => item.id === values.get("roleId"));
    if (!role) return setDialogError("Create and select an event role first.");
    const common = {
      roleId: role.id, roleType: role.role_type, fullName: String(values.get("fullName")),
      email: String(values.get("email")), phone: String(values.get("phone")), callTime: String(values.get("callTime")),
    };
    if (dialog === "edit" && selected) {
      void run(() => updatePersonAssignment({ ...common, assignmentId: selected.id, personId: selected.person_id }), "Person updated");
    } else {
      void run(() => createPersonAssignment({ ...common, eventId: event.id, organizationName: String(values.get("organization")) }), "Person assigned and CT Global ID ready");
    }
  };

  const submitLogistics = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!selected) return;
    const values = new FormData(formEvent.currentTarget);
    if (logisticsKind === "flight") {
      void run(() => addFlight(selected.id, {
        direction: values.get("direction"), airline: values.get("airline"), flight_number: values.get("flightNumber"),
        origin_airport: values.get("origin"), destination_airport: values.get("destination"),
        scheduled_at: new Date(String(values.get("scheduledAt"))).toISOString(), status: "scheduled",
      }, firstFlight?.id), firstFlight ? "Flight updated" : "Flight added");
    } else if (logisticsKind === "transport") {
      void run(() => addTransport(selected.id, {
        pickup_location: values.get("pickup"), dropoff_location: values.get("dropoff"),
        scheduled_pickup_at: new Date(String(values.get("scheduledAt"))).toISOString(),
        vehicle_reference: values.get("vehicle"), driver_name: values.get("driverName"), driver_phone: values.get("driverPhone"),
      }, firstTransport?.id), firstTransport ? "Transport updated" : "Transport added");
    } else {
      const checkIn = String(values.get("checkIn"));
      const checkOut = String(values.get("checkOut"));
      if (new Date(`${checkOut}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
        setDialogError("Hotel checkout must be at least one day after check-in.");
        return;
      }
      void run(() => addHotel(selected.id, {
        hotel_name: values.get("hotelName"), room_type: values.get("roomType"), confirmation_number: values.get("confirmation"),
        check_in_date: checkIn, check_out_date: checkOut, status: "confirmed",
      }, firstHotel?.id), firstHotel ? "Hotel booking updated" : "Hotel booking added");
    }
  };

  const importCsv = async (file: File) => {
    if (!event) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) return setNotice("CSV must include a header and at least one person");
    setBusy(true);
    try {
      for (const row of rows) {
        const label = row.role || "Crew";
        let role = workspace?.roles.find((item) => item.label.toLowerCase() === label.toLowerCase());
        if (!role) role = await createRole(event.id, label, (row.role_type as PersonRole) || "crew");
        await createPersonAssignment({ eventId: event.id, roleId: role.id, roleType: role.role_type, fullName: row.full_name, email: row.email, phone: row.phone, organizationName: row.organization });
      }
      setNotice(`${rows.length} people imported`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "CSV import failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="phase-admin-page">
      <aside className={`phase-admin-sidebar ${mobileNav ? "open" : ""}`}>
        <a className="phase-admin-brand" href="/"><BrandMark size={32} /><b>calltime</b><small>global</small></a>
        <button className="phase-sidebar-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        <button type="button" className="phase-event-card" onClick={() => changeView("events")}>
          <span>ACTIVE EVENT</span><b>{event?.name ?? "No event configured"}</b><small>{event ? `${event.city ?? "Location pending"} · ${new Date(event.starts_at).toLocaleDateString()}` : "Create your pilot event"}</small>
          <ChevronRight size={15} />
        </button>
        <nav>
          <button className={activeView === "overview" ? "active" : ""} onClick={() => changeView("overview")}><LayoutDashboard size={17} /> Overview</button>
          <button className={activeView === "events" ? "active" : ""} onClick={() => changeView("events")}><CalendarDays size={17} /> Events <small>{workspace?.events.length ?? 0}</small></button>
          <button className={activeView === "people" ? "active" : ""} onClick={() => changeView("people")}><UsersRound size={17} /> People <small>{assignments.length}</small></button>
          <button className={activeView === "roles" ? "active" : ""} onClick={() => changeView("roles")}><UserPlus size={17} /> Event roles <small>{workspace?.roles.length ?? 0}</small></button>
          <button className={activeView === "logistics" ? "active" : ""} onClick={() => changeView("logistics")}><Plane size={17} /> Logistics <small>{logisticsReadyCount}</small></button>
          <button className={activeView === "accreditation" ? "active" : ""} onClick={() => changeView("accreditation")}><ShieldCheck size={17} /> Accreditation <small>{readyCount + issuedCount}</small></button>
        </nav>
        <div className="phase-sidebar-foot">
          <span><i /> Database connected</span>
          <button onClick={() => void supabase.auth.signOut()}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      {mobileNav && <button className="phase-nav-backdrop" onClick={() => setMobileNav(false)} />}

      <main className="phase-admin-main">
        <header className="phase-admin-header">
          <button className="phase-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div><span><i /> LIVE WORKSPACE</span><b>{event?.name ?? "SETUP"}</b></div>
          <button className="phase-user">{session.user.email?.slice(0, 2).toUpperCase()}</button>
        </header>

        <div className="phase-admin-content">
          <div className="phase-heading">
            <div><span>{heading.eyebrow}</span><h1>{heading.title}</h1><p>{heading.description}</p></div>
            <div className="phase-heading-actions">
              {activeView === "people" && <>
                <label className="mvp-secondary"><FileUp size={15} /> Import CSV<input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && void importCsv(e.target.files[0])} /></label>
                <button className="mvp-secondary" onClick={() => setDialog("role")} disabled={!event}><Plus size={15} /> Role</button>
              </>}
              {activeView === "events" && <button className="mvp-primary" onClick={() => setDialog("event")}><Plus size={15} /> New event</button>}
              {activeView === "roles" && <button className="mvp-primary" onClick={() => { setReturnAfterRole(null); setDialog(event ? "role" : "event"); }}><Plus size={15} /> {event ? "New role" : "Create event"}</button>}
              {activeView !== "events" && activeView !== "roles" && <button className="mvp-primary" onClick={() => setDialog(event ? "person" : "event")}><UserPlus size={15} /> {event ? "Add person" : "Create event"}</button>}
            </div>
          </div>

          {notice && <div className="phase-notice"><CheckCircle2 size={15} /><span>{notice}</span><button onClick={() => setNotice("")}><X size={14} /></button></div>}

          {activeView === "overview" && <>
          <section className="phase-metrics">
            <article className="primary"><span>PEOPLE IN VIEW</span><strong>{assignments.length.toLocaleString()}</strong><p>Permanent identities assigned to this event</p></article>
            <article><span>LOGISTICS READY</span><strong>{logisticsReadyCount}</strong><p>Profiles with at least one movement</p></article>
            <article><span>ACCREDITATION</span><strong>{readyCount}</strong><p>QR credentials ready for collection</p></article>
          </section>

          <section className="phase-overview-grid">
            <article className="phase-overview-event">
              <div className="phase-card-heading"><div><span>ACTIVE EVENT</span><h2>{event?.name ?? "No active event"}</h2></div>{event && <i>LIVE</i>}</div>
              {event ? <>
                <div className="phase-event-facts">
                  <span><CalendarDays size={17} /><b>{new Date(event.starts_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</b><small>Start date</small></span>
                  <span><MapPin size={17} /><b>{event.venue_name || event.city || "Pending"}</b><small>{event.city || "Location"}</small></span>
                  <span><UsersRound size={17} /><b>{assignments.length}</b><small>People assigned</small></span>
                </div>
                <button className="phase-text-action" onClick={() => changeView("events")}>View all events <ChevronRight size={15} /></button>
              </> : <div className="phase-empty compact"><p>Create your pilot event to activate people, logistics and accreditation.</p><button className="mvp-primary" onClick={() => setDialog("event")}>Create event</button></div>}
            </article>
            <article className="phase-overview-actions">
              <div className="phase-card-heading"><div><span>NEXT ACTIONS</span><h2>Keep operations moving</h2></div></div>
              <button onClick={() => changeView("people")}><UsersRound size={18} /><span><b>Build the event roster</b><small>Add people, roles or import a CSV</small></span><ChevronRight size={16} /></button>
              <button onClick={() => changeView("logistics")}><Plane size={18} /><span><b>Complete logistics</b><small>{Math.max(assignments.length - logisticsReadyCount, 0)} profiles still need movement details</small></span><ChevronRight size={16} /></button>
              <button onClick={() => changeView("accreditation")}><QrCode size={18} /><span><b>Prepare badge links</b><small>{readyCount + issuedCount} credentials currently prepared</small></span><ChevronRight size={16} /></button>
            </article>
          </section>
          </>}

          {activeView === "people" && <section className="phase-people-panel">
            <div className="phase-panel-head"><div><h2>Event roster</h2><p>{filtered.length} people shown</p></div><label className="phase-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search person, role or email" /></label></div>
            {!event ? (
              <div className="phase-empty"><CalendarDays size={28} /><h3>Create the pilot event first</h3><p>Your authenticated account must be a super admin to create the first event.</p><button className="mvp-primary" onClick={() => setDialog("event")}>Create event</button></div>
            ) : filtered.length === 0 ? (
              <div className="phase-empty"><UsersRound size={28} /><h3>No people yet</h3><p>Add a person or import a crew CSV to start the roster.</p></div>
            ) : (
              <div className="phase-table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Contact</th><th>Logistics</th><th>Status</th><th /></tr></thead><tbody>
                {filtered.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className={selected?.id === item.id ? "selected" : ""}>
                  <td><span className="phase-avatar">{item.people.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="phase-person-name"><b>{item.people.full_name}</b><small>{formatCtGlobalId(item.people.id)}</small></span></td>
                  <td>{item.event_roles?.label ?? "Unassigned"}</td><td>{item.people.email ?? item.people.phone ?? "—"}</td>
                  <td><span className="phase-logistics-icons"><Plane className={item.flights.length ? "ready" : ""} size={14} /><Truck className={item.ground_transport.length ? "ready" : ""} size={14} /><Hotel className={item.hotel_bookings.length ? "ready" : ""} size={14} /></span></td>
                  <td><span className={`phase-status ${item.status}`}>{item.status}</span></td><td>›</td>
                </tr>)}
              </tbody></table></div>
            )}
          </section>}

          {activeView === "roles" && <section className="phase-section-card">
            <div className="phase-panel-head"><div><h2>Roles for {event?.name ?? "this event"}</h2><p>{workspace?.roles.length ?? 0} role{workspace?.roles.length === 1 ? "" : "s"} available in the person form</p></div></div>
            {!event ? <div className="phase-empty"><CalendarDays size={28} /><h3>Create an event first</h3><p>Roles belong to a specific event.</p><button className="mvp-primary" onClick={() => setDialog("event")}>Create event</button></div> : (workspace?.roles.length ?? 0) === 0 ? <div className="phase-empty"><UserPlus size={28} /><h3>No event roles yet</h3><p>Create the first role, such as Artist, Tour Manager, Lighting Crew or VIP Guest.</p><button className="mvp-primary" onClick={() => { setReturnAfterRole(null); setDialog("role"); }}><Plus size={15} /> Create first role</button></div> :
              <div className="phase-role-grid">{workspace?.roles.map((role) => <article key={role.id}>
                <span className="phase-role-icon"><UserPlus size={17} /></span>
                <div><b>{role.label}</b><small>{roleTypes.find((item) => item.value === role.role_type)?.label ?? role.role_type}</small></div>
                <span className="phase-role-count">{assignments.filter((item) => item.event_roles?.id === role.id).length} people</span>
              </article>)}</div>}
          </section>}

          {activeView === "events" && <section className="phase-section-card">
            <div className="phase-panel-head"><div><h2>All events</h2><p>{workspace?.events.length ?? 0} event{workspace?.events.length === 1 ? "" : "s"} in this workspace</p></div></div>
            {(workspace?.events.length ?? 0) === 0 ? <div className="phase-empty"><CalendarDays size={28} /><h3>No events yet</h3><p>Create the pilot event to start assigning people and logistics.</p><button className="mvp-primary" onClick={() => setDialog("event")}>Create event</button></div> :
              <div className="phase-event-grid">{workspace?.events.map((item) => {
                const isActive = item.id === event?.id;
                return <button type="button" className={`phase-event-tile ${isActive ? "active" : ""}`} key={item.id} onClick={() => void selectEvent(item.id)}>
                  <div><span>{isActive ? "ACTIVE EVENT" : "EVENT"}</span>{isActive && <i>SELECTED</i>}</div>
                  <h3>{item.name}</h3>
                  <p><MapPin size={14} /> {item.venue_name || item.city || "Location pending"}</p>
                  <p><CalendarDays size={14} /> {new Date(item.starts_at).toLocaleDateString()} – {new Date(item.ends_at).toLocaleDateString()}</p>
                  <strong>{isActive ? "Currently in view" : "Open workspace"}<ChevronRight size={15} /></strong>
                </button>;
              })}</div>}
          </section>}

          {activeView === "logistics" && <section className="phase-section-card">
            <div className="phase-panel-head"><div><h2>Logistics coverage</h2><p>{logisticsReadyCount} of {assignments.length} profiles have movement details</p></div></div>
            {!event ? <div className="phase-empty"><CalendarDays size={28} /><h3>Select an event first</h3><button className="mvp-primary" onClick={() => changeView("events")}>View events</button></div> : assignments.length === 0 ? <div className="phase-empty"><Plane size={28} /><h3>No people to schedule</h3><p>Add the event roster before entering flights, transfers and hotels.</p><button className="mvp-primary" onClick={() => changeView("people")}>Go to people</button></div> :
              <div className="phase-table-wrap"><table className="phase-operations-table"><thead><tr><th>Person</th><th>Flight</th><th>Ground transport</th><th>Hotel</th><th /></tr></thead><tbody>{assignments.map((item) => <tr key={item.id}>
                <td><span className="phase-avatar">{item.people.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><b>{item.people.full_name}</b><small>{item.event_roles?.label ?? "Unassigned"}</small></span></td>
                <td><span className={`phase-readiness ${item.flights.length ? "ready" : "pending"}`}><Plane size={13} /> {item.flights.length ? "Ready" : "Pending"}</span></td>
                <td><span className={`phase-readiness ${item.ground_transport.length ? "ready" : "pending"}`}><Truck size={13} /> {item.ground_transport.length ? "Ready" : "Pending"}</span></td>
                <td><span className={`phase-readiness ${item.hotel_bookings.length ? "ready" : "pending"}`}><Hotel size={13} /> {item.hotel_bookings.length ? "Ready" : "Pending"}</span></td>
                <td><button className="phase-row-action" onClick={() => { setSelected(item); setDialog("logistics"); }}>Manage</button></td>
              </tr>)}</tbody></table></div>}
          </section>}

          {activeView === "accreditation" && <section className="phase-section-card">
            <div className="phase-panel-head"><div><h2>Accreditation queue</h2><p>Generate a secure personal link to prepare each QR credential</p></div></div>
            {!event ? <div className="phase-empty"><ShieldCheck size={28} /><h3>Select an event first</h3><button className="mvp-primary" onClick={() => changeView("events")}>View events</button></div> : assignments.length === 0 ? <div className="phase-empty"><QrCode size={28} /><h3>No accreditation records yet</h3><p>Add people to the event before preparing badge links.</p><button className="mvp-primary" onClick={() => changeView("people")}>Go to people</button></div> :
              <div className="phase-accreditation-grid">{assignments.map((item) => {
                const accreditation = item.accreditations?.[0] as any;
                const status = accreditation?.status ?? "not prepared";
                return <article key={item.id} className="phase-accreditation-card">
                  <div><span className="phase-avatar">{item.people.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><b>{item.people.full_name}</b><small>{item.event_roles?.label ?? "Unassigned"}</small></span></div>
                  <span className={`phase-status ${status.replace(" ", "-")}`}>{status}</span>
                  <div className="phase-accreditation-actions"><button className="mvp-secondary" onClick={() => setSelected(item)}>Open profile</button><button className="mvp-primary" onClick={() => void run(async () => {
                    const result = await generatePersonalLink(item.id);
                    await navigator.clipboard.writeText(result.url);
                  }, "Secure personal link copied")}>{accreditation ? <Link2 size={14} /> : <QrCode size={14} />} {accreditation ? "New link" : "Prepare & copy"}</button></div>
                </article>;
              })}</div>}
          </section>}
        </div>
      </main>

      {selected && <aside className="phase-detail">
        <button className="phase-detail-close" onClick={() => setSelected(null)}><X size={18} /></button>
        <span className="phase-avatar large">{selected.people.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
        <span className="phase-detail-kicker">PERSON PROFILE</span><h2>{selected.people.full_name}</h2>
        <div className="phase-global-id">
          <span className="phase-global-id-icon"><ShieldCheck size={18} /></span>
          <span><small>CT GLOBAL ID</small><code>{formatCtGlobalId(selected.people.id)}</code></span>
          <button title="Copy CT Global ID" onClick={() => void navigator.clipboard.writeText(formatCtGlobalId(selected.people.id)).then(() => setNotice("CT Global ID copied"))}><Copy size={14} /> Copy ID</button>
        </div>
        <p>{selected.event_roles?.label ?? "Unassigned"} · {event?.name}</p>
        <label className="phase-field">Assignment status<select value={selected.status} onChange={(e) => void run(() => updateAssignmentStatus(selected.id, e.target.value), "Status updated")}><option value="invited">Invited</option><option value="confirmed">Confirmed</option><option value="arrived">Arrived</option><option value="accredited">Accredited</option><option value="departed">Departed</option><option value="cancelled">Cancelled</option></select></label>
        <div className="phase-detail-stats"><span><Plane size={16} /><b>{selected.flights.length}</b> flights</span><span><Truck size={16} /><b>{selected.ground_transport.length}</b> transfers</span><span><Hotel size={16} /><b>{selected.hotel_bookings.length}</b> stays</span></div>
        <button className="mvp-secondary wide" onClick={() => setDialog("edit")}><UserPlus size={15} /> Edit person</button>
        <button className="mvp-secondary wide" onClick={() => setDialog("logistics")}><Plus size={15} /> Add logistics</button>
        <button className="mvp-primary wide" onClick={() => void run(async () => {
          const result = await generatePersonalLink(selected.id); await navigator.clipboard.writeText(result.url); setNotice("Secure personal link copied");
        }, "Secure personal link copied")}><Link2 size={15} /> Generate & copy link</button>
        <small className="phase-security-note"><ShieldCheck size={13} /> Link is one-time, hashed and expires automatically.</small>
      </aside>}

      {dialog && <div className="phase-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}><section className="phase-dialog">
        <header><div><span>CALLTIME / PHASE 01</span><h2>{dialog === "person" ? "Add a person" : dialog === "edit" ? "Edit person" : dialog === "role" ? "Create event role" : dialog === "event" ? "Create pilot event" : "Add logistics"}</h2></div><button onClick={() => setDialog(null)}><X size={18} /></button></header>
        {dialogError && <div className="phase-dialog-error"><X size={14} /><span>{dialogError}</span></div>}
        {dialog === "event" && <form onSubmit={submitEvent} className="phase-form"><label>Event name<input name="name" required /></label><div className="two"><label>City<input name="city" /></label><label>Venue<input name="venue" /></label></div><div className="two"><label>Starts<input name="startsAt" type="datetime-local" onChange={(e) => constrainFollowingDate(e, "endsAt")} required /></label><label>Ends<input name="endsAt" type="datetime-local" required /></label></div><small className="phase-form-hint">The end date and time must be later than the start.</small><label>Timezone<input name="timezone" defaultValue="Asia/Riyadh" required /></label><button className="mvp-primary" disabled={busy}>Create event</button></form>}
        {dialog === "role" && <form onSubmit={submitRole} className="phase-form"><label>Role label<input name="label" placeholder="Lighting crew" required /></label><label>Role type<select name="roleType">{roleTypes.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label><button className="mvp-primary" disabled={busy}>Add role</button></form>}
        {(dialog === "person" || dialog === "edit") && <form onSubmit={submitPerson} className="phase-form"><label>Full name<input name="fullName" defaultValue={dialog === "edit" ? selected?.people.full_name : ""} required /></label><div className="two"><label>Email<input name="email" type="email" defaultValue={dialog === "edit" ? selected?.people.email ?? "" : ""} /></label><label>Phone<input name="phone" type="tel" defaultValue={dialog === "edit" ? selected?.people.phone ?? "" : ""} /></label></div>{dialog === "person" && <label>Organization / agency<input name="organization" /></label>}<div className="phase-role-picker"><div><span>Event role</span><button type="button" onClick={() => { setReturnAfterRole(dialog); setDialog("role"); }}><Plus size={13} /> Create new role</button></div><select name="roleId" defaultValue={dialog === "edit" ? selected?.event_roles?.id ?? "" : ""} required><option value="">Select role</option>{workspace?.roles.map((role) => <option value={role.id} key={role.id}>{role.label}</option>)}</select>{workspace?.roles.length === 0 && <small>No roles exist for this event yet. Create one to continue.</small>}</div><label>Call time<input name="callTime" type="datetime-local" defaultValue={dialog === "edit" ? dateTimeInput(selected?.call_time) : ""} /></label><button className="mvp-primary" disabled={busy || workspace?.roles.length === 0}>{dialog === "edit" ? "Save changes" : "Create CT Global ID & assign"}</button></form>}
        {dialog === "logistics" && selected && <><div className="phase-logistics-tabs"><button className={logisticsKind === "flight" ? "active" : ""} onClick={() => setLogisticsKind("flight")}><Plane size={14} /> Flight</button><button className={logisticsKind === "transport" ? "active" : ""} onClick={() => setLogisticsKind("transport")}><Truck size={14} /> Transport</button><button className={logisticsKind === "hotel" ? "active" : ""} onClick={() => setLogisticsKind("hotel")}><Hotel size={14} /> Hotel</button></div><form onSubmit={submitLogistics} className="phase-form">
          {logisticsKind === "flight" && <><div className="two"><label>Direction<select name="direction" defaultValue={firstFlight?.direction ?? "arrival"}><option value="arrival">Arrival</option><option value="departure">Departure</option></select></label><label>Airline<input name="airline" defaultValue={firstFlight?.airline ?? ""} /></label></div><label>Flight number<input name="flightNumber" defaultValue={firstFlight?.flight_number ?? ""} required /></label><div className="two"><label>Origin<input name="origin" defaultValue={firstFlight?.origin_airport ?? ""} /></label><label>Destination<input name="destination" defaultValue={firstFlight?.destination_airport ?? ""} /></label></div><label>Scheduled time<input name="scheduledAt" type="datetime-local" defaultValue={dateTimeInput(firstFlight?.scheduled_at)} required /></label></>}
          {logisticsKind === "transport" && <><label>Pickup<input name="pickup" defaultValue={firstTransport?.pickup_location ?? ""} required /></label><label>Drop-off<input name="dropoff" defaultValue={firstTransport?.dropoff_location ?? ""} required /></label><label>Pickup time<input name="scheduledAt" type="datetime-local" defaultValue={dateTimeInput(firstTransport?.scheduled_pickup_at)} required /></label><div className="two"><label>Vehicle / plate<input name="vehicle" defaultValue={firstTransport?.vehicle_reference ?? ""} /></label><label>Driver name<input name="driverName" defaultValue={firstTransport?.driver_name ?? ""} /></label></div><label>Driver phone<input name="driverPhone" defaultValue={firstTransport?.driver_phone ?? ""} /></label></>}
          {logisticsKind === "hotel" && <><label>Hotel name<input name="hotelName" defaultValue={firstHotel?.hotel_name ?? ""} required /></label><div className="two"><label>Room type<input name="roomType" defaultValue={firstHotel?.room_type ?? ""} /></label><label>Confirmation<input name="confirmation" defaultValue={firstHotel?.confirmation_number ?? ""} /></label></div><div className="two"><label>Check in<input name="checkIn" type="date" defaultValue={firstHotel?.check_in_date ?? ""} onChange={(e) => constrainFollowingDate(e, "checkOut", true)} required /></label><label>Check out<input name="checkOut" type="date" min={nextCalendarDate(firstHotel?.check_in_date ?? "")} defaultValue={firstHotel?.check_out_date ?? ""} required /></label></div><small className="phase-form-hint">Checkout must be at least one day after check-in.</small></>}
          <button className="mvp-primary" disabled={busy}>Save logistics</button>
        </form></>}
      </section></div>}
      {busy && <div className="phase-busy"><LoaderCircle className="spin" size={18} /> Working…</div>}
    </div>
  );
}
