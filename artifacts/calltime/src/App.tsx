import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Hotel,
  Menu,
  MapPin,
  Plane,
  QrCode,
  Route as RouteIcon,
  ShieldCheck,
  Smartphone,
  Ticket,
  Truck,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import BrandMark from "./components/BrandMark";
import { Route as WouterRoute, Switch } from "wouter";

const Dashboard = lazy(() => import("./components/Dashboard"));
const PhaseOneAdmin = lazy(() => import("./components/PhaseOneAdmin"));
const PersonalProfile = lazy(() => import("./components/PersonalProfile"));

type Role = {
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  outputs: string[];
};

const roles: Role[] = [
  {
    name: "Producers",
    title: "See the whole show move.",
    description:
      "One operational view for the people, moments and handoffs that decide whether a show opens on time. Less chasing. More control.",
    icon: Ticket,
    outputs: ["Live headcount", "Supplier status", "Exception view"],
  },
  {
    name: "Tour managers",
    title: "Keep the road in rhythm.",
    description:
      "Every itinerary, transfer, room and credential attached to the same person record — ready for the next city before the cases leave the last one.",
    icon: RouteIcon,
    outputs: ["Tour party", "Travel days", "Personal links"],
  },
  {
    name: "Venue teams",
    title: "Make every arrival legible.",
    description:
      "Give front-of-house and access teams a current, scannable source of truth. Know who is arriving, where they belong and what they need.",
    icon: MapPin,
    outputs: ["Accreditation", "Access zones", "Arrival windows"],
  },
  {
    name: "Operations leads",
    title: "Turn moving parts into signals.",
    description:
      "Replace message threads with a calm command layer that surfaces what needs attention now, without losing the detail behind it.",
    icon: ShieldCheck,
    outputs: ["Task ownership", "Audit trail", "Live exceptions"],
  },
];

const services = [
  {
    icon: Plane,
    title: "Flights",
    copy: "Itineraries and arrival detail that do not get lost in a group chat.",
    tone: "dark",
  },
  {
    icon: Truck,
    title: "Ground transport",
    copy: "Drivers, routes and movement windows aligned to the running order.",
    tone: "light",
  },
  {
    icon: Hotel,
    title: "Hotel & rooms",
    copy: "Rooming lists connected to the people actually checking in.",
    tone: "light",
  },
  {
    icon: QrCode,
    title: "Accreditation",
    copy: "QR-ready access, with the right person and zone at the door.",
    tone: "light",
  },
  {
    icon: Users,
    title: "People ops",
    copy: "Artists, crews, suppliers and guests — one operating picture.",
    tone: "pink",
  },
  {
    icon: WalletCards,
    title: "Briefs & handoffs",
    copy: "Give each team the exact slice of information needed to move.",
    tone: "light",
  },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeRole, setActiveRole] = useState(roles[0].name);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const openDemo = () => {
    setSubmitted(false);
    setDemoOpen(true);
    setMenuOpen(false);
  };

  const closeDemo = () => setDemoOpen(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const selectedRole =
    roles.find((role) => role.name === activeRole) ?? roles[0];
  const SelectedRoleIcon = selectedRole.icon;

  return (
    <div className="calltime-page" id="top">
      <header className="site-nav" data-testid="site-header">
        <div className="container-wide nav-inner">
          <a
            className="logo-lockup"
            href="#top"
            data-testid="link-logo"
            aria-label="Calltime home"
          >
            <span className="logo-mark">
              <BrandMark size={30} />
            </span>
            <span className="logo-word">calltime</span>
            <span className="brand-suffix">global</span>
          </a>
          <nav className="nav-links" aria-label="Primary navigation">
            <a
              className="nav-link"
              href="#platform"
              data-testid="link-platform"
            >
              Platform
            </a>
            <a
              className="nav-link"
              href="#global-id"
              data-testid="link-global-id"
            >
              CT Global ID
            </a>
            <a
              className="nav-link"
              href="#logistics"
              data-testid="link-logistics"
            >
              People logistics
            </a>
            <a className="nav-link" href="#roles" data-testid="link-roles">
              For teams
            </a>
            <a
              className="nav-workspace"
              href="/dashboard"
              data-testid="link-dashboard"
            >
              Live workspace <span>↗</span>
            </a>
            <button
              className="button-accent nav-cta"
              type="button"
              onClick={openDemo}
              data-testid="button-nav-demo"
            >
              Book a walkthrough <ArrowUpRight size={14} />
            </button>
          </nav>
          <button
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
          <div
            className={`mobile-menu ${menuOpen ? "is-open" : ""}`}
            aria-hidden={!menuOpen}
            data-testid="mobile-navigation"
          >
            <a
              className="nav-link"
              href="#platform"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
              data-testid="mobile-link-platform"
            >
              Platform
            </a>
            <a
              className="nav-link"
              href="#global-id"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
              data-testid="mobile-link-global-id"
            >
              CT Global ID
            </a>
            <a
              className="nav-link"
              href="#logistics"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
              data-testid="mobile-link-logistics"
            >
              People logistics
            </a>
            <a
              className="nav-link"
              href="#roles"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
              data-testid="mobile-link-roles"
            >
              For teams
            </a>
            <a
              className="nav-workspace"
              href="/dashboard"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
              data-testid="mobile-link-dashboard"
            >
              Live workspace <span>↗</span>
            </a>
            <button
              className="button-accent"
              tabIndex={menuOpen ? 0 : -1}
              type="button"
              onClick={openDemo}
              data-testid="button-mobile-demo"
            >
              Book a walkthrough <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-grid" />
          <div className="container-wide hero-content">
            <div className="hero-copy reveal">
              <div className="eyebrow" data-testid="text-hero-eyebrow">
                Back-of-house event operations / Middle East
              </div>
              <h1
                className="hero-title"
                id="hero-title"
                data-testid="text-hero-title"
              >
                Every person.
                <br />
                <em>Every movement.</em>
              </h1>
              <p className="hero-subtitle" data-testid="text-hero-subtitle">
                Calltime connects the people logistics behind major live
                events—artists, crew, suppliers and guests—from first flight
                to final accreditation scan.
              </p>
              <div className="hero-actions">
                <button
                  className="button-accent"
                  type="button"
                  onClick={openDemo}
                  data-testid="button-hero-demo"
                >
                  See Calltime in action <ArrowUpRight size={15} />
                </button>
                <a
                  className="button-quiet"
                  href="/dashboard"
                  data-testid="link-hero-platform"
                >
                  Explore the workspace <ChevronRight size={15} />
                </a>
              </div>
              <div className="hero-signals" data-testid="text-hero-proof">
                <span><ShieldCheck size={14} /> Permanent CT Global ID</span>
                <span><Smartphone size={14} /> Personal mobile link</span>
                <span><QrCode size={14} /> QR accreditation</span>
              </div>
            </div>
            <div
              className="hero-console reveal delay-2"
              aria-label="Calltime operations console preview"
              data-testid="card-hero-console"
            >
              <div className="console-window">
                <div className="console-topbar">
                  <div className="window-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="console-brand">CALLTIME / OPERATIONS</span>
                  <span className="console-status"><i /> Live operation</span>
                </div>
                <div className="console-body">
                  <aside className="console-nav">
                    <p className="console-nav-label">Workspace</p>
                    <span className="console-nav-item active">Overview</span>
                    <span className="console-nav-item">People</span>
                    <span className="console-nav-item">Movements</span>
                    <span className="console-nav-item">Accreditation</span>
                    <span className="console-nav-item">Reports</span>
                  </aside>
                  <div className="console-main">
                    <div className="console-heading">
                      <div>
                        <h3>Desert Sound / Day 02</h3>
                        <p>Riyadh · 18 OCT 2025 · GATES 17:30</p>
                      </div>
                      <span className="console-icon">
                        <CalendarDays size={13} />
                      </span>
                    </div>
                    <div className="console-stats">
                      <div className="console-stat">
                        <b>1,284</b>
                        <span>People</span>
                      </div>
                      <div className="console-stat">
                        <b>86%</b>
                        <span>Ready</span>
                      </div>
                      <div className="console-stat">
                        <b>07</b>
                        <span>Flags</span>
                      </div>
                    </div>
                    <div className="console-list">
                      <div className="console-row">
                        <span className="mini-avatar">AR</span>
                        <div>
                          <strong>Artist party / 04</strong>
                          <small>Flight QRH 204 · 15:40</small>
                        </div>
                        <span className="row-state">Ready</span>
                      </div>
                      <div className="console-row">
                        <span className="mini-avatar">PT</span>
                        <div>
                          <strong>Production / 36</strong>
                          <small>Hotel check-in · 16:00</small>
                        </div>
                        <span className="row-state">Ready</span>
                      </div>
                      <div className="console-row">
                        <span className="mini-avatar">SV</span>
                        <div>
                          <strong>Supplier / 12</strong>
                          <small>Gate C · 17:10</small>
                        </div>
                        <span className="row-state">Review</span>
                      </div>
                      <div className="console-row">
                        <span className="mini-avatar">ME</span>
                        <div>
                          <strong>Media / 48</strong>
                          <small>Accreditation · 17:30</small>
                        </div>
                        <span className="row-state">Ready</span>
                      </div>
                    </div>
                    <div className="console-bottom">
                      <span>Last sync 14:32 GST</span>
                      <strong>View command log →</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-cue">
            <span /> Scroll to see the system
          </div>
        </section>

        <div className="marquee-band" aria-label="Calltime capabilities">
          <div className="marquee-track">
            {[...Array(2)]
              .flatMap(() => [
                "One source of truth",
                "Built for show day",
                "From invite to ingress",
                "The operational layer",
              ])
              .map((item, index) => (
                <div
                  className="marquee-item"
                  key={`${item}-${index}`}
                  data-testid={`text-marquee-${index}`}
                >
                  <i />
                  {item}
                </div>
              ))}
          </div>
        </div>

        <section
          className="section section-dark"
          id="platform"
          aria-labelledby="platform-title"
        >
          <div className="container-wide">
            <div className="intro-grid">
              <div className="reveal">
                <div className="eyebrow eyebrow-dark">01 / The platform</div>
                <div className="intro-stat" data-testid="text-platform-stat">
                  <strong>One connected experience.</strong> Fewer handoffs
                  hiding in inboxes. More certainty at every checkpoint.
                </div>
              </div>
              <div className="section-heading reveal delay-1">
                <h2 id="platform-title">One journey from invite to ingress.</h2>
                <p className="dark-copy">
                  Create a permanent identity once, assign it to an event, then
                  keep every travel detail, room, movement and credential in
                  sync. The operations team sees the full picture; each person
                  sees exactly what they need.
                </p>
              </div>
            </div>
            <div
              className="flow-map reveal delay-2"
              data-testid="card-operational-flow"
            >
              {[
                [
                  "01",
                  "Create the profile",
                  "Every artist, crew member, supplier and guest receives a permanent CT Global ID.",
                ],
                [
                  "02",
                  "Assign the event",
                  "Add the person once and connect their role, schedule, access and event team.",
                ],
                [
                  "03",
                  "Send their link",
                  "A personal link opens their own live itinerary on any phone, with no searching.",
                ],
                [
                  "04",
                  "Move and scan",
                  "Flights, drivers, hotel and accreditation stay together through show day.",
                ],
              ].map(([number, title, copy]) => (
                <article
                  className="flow-step"
                  tabIndex={0}
                  key={number}
                  data-testid={`card-flow-${number}`}
                >
                  <span className="flow-number">{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="section id-section"
          id="global-id"
          aria-labelledby="global-id-title"
        >
          <div className="container-wide id-grid">
            <div
              className="id-card reveal"
              tabIndex={0}
              data-testid="card-global-id-preview"
            >
              <div className="id-card-top">
                <div className="id-mark">
                  <span className="mark-box">ct</span> CT Global ID
                </div>
                <span className="id-chip">Verified profile</span>
              </div>
              <div className="id-person">
                <div className="id-photo">NA</div>
                <div>
                  <h3>Nadia Al-Harbi</h3>
                  <p>Tour manager · Horizon Live</p>
                </div>
              </div>
              <div className="id-meta">
                <div>
                  <span>Current event</span>
                  <strong>Desert Sound / Day 02</strong>
                </div>
                <div>
                  <span>Access</span>
                  <strong>All production zones</strong>
                </div>
                <div>
                  <span>Next movement</span>
                  <strong>Driver 04 · 16:25</strong>
                </div>
                <div>
                  <span>Profile ID</span>
                  <strong>CT-7A41-09</strong>
                </div>
              </div>
              <div className="id-card-bottom">
                <span>Updated 14:32 GST · Secure & private</span>
                <span className="fake-qr">
                  {[...Array(25)].map((_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </div>
            </div>
            <div className="reveal delay-1">
              <div className="eyebrow">02 / The identity layer</div>
              <div className="section-heading">
                <h2 id="global-id-title">One person. Every event.</h2>
                <p className="dark-copy">
                  CT Global ID gives every artist, crew member, supplier and
                  guest a living operational profile. Their details stay with
                  them, so your team does not have to rebuild the same picture
                  every time.
                </p>
              </div>
              <div className="feature-list">
                {[
                  [
                    "01",
                    "A single source of truth",
                    "Identity, preferences and event permissions stay connected across the operation.",
                  ],
                  [
                    "02",
                    "Built for the person on the move",
                    "Share only what each person needs through a clean, personal logistics link.",
                  ],
                  [
                    "03",
                    "Ready at the gate",
                    "Turn a verified profile into access, accreditation and a faster arrival.",
                  ],
                ].map(([number, title, copy]) => (
                  <div
                    className="feature-row"
                    key={number}
                    data-testid={`row-global-id-${number}`}
                  >
                    <b>{number}</b>
                    <div>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="section"
          id="logistics"
          aria-labelledby="logistics-title"
        >
          <div className="container-wide">
            <div className="logistics-heading">
              <div className="section-heading reveal">
                <div className="eyebrow">03 / The full picture</div>
                <h2 id="logistics-title">
                  Everything that gets a person to the room.
                </h2>
              </div>
              <p className="reveal delay-1">
                Not another database. A connected set of movements, permissions
                and context that stays useful when plans change.
              </p>
            </div>
            <div className="logistics-grid">
              {services.map(({ icon: Icon, title, copy }, index) => (
                <article
                  className={`logistics-card reveal delay-${(index % 3) + 1}`}
                  tabIndex={0}
                  key={title}
                  data-testid={`card-logistics-${index}`}
                >
                  <span className="card-icon">
                    <Icon size={17} />
                  </span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  {(title === "Flights" || title === "Accreditation") && (
                    <div className="service-tags">
                      <span className="service-tag">Live updates</span>
                      <span className="service-tag">Team view</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section link-section" aria-labelledby="link-title">
          <div className="container-wide link-grid">
            <div className="link-copy reveal">
              <div className="eyebrow eyebrow-dark">
                04 / The personal moment
              </div>
              <div className="section-heading">
                <h2 id="link-title">Your logistics. In your pocket.</h2>
                <p className="dark-copy">
                  Give each person a personal link that feels clear, not
                  cluttered. Their flight, ground transport, hotel and
                  accreditation QR code—in the order they need it, wherever the
                  day takes them.
                </p>
              </div>
              <div className="link-note">
                <CircleCheck size={15} /> One private link. Their details only.
              </div>
            </div>
            <div
              className="phone-stage reveal delay-2"
              data-testid="card-personal-link"
            >
              <div className="floating-link">
                <i /> Link opened · 14:32 GST
              </div>
              <div className="floating-card">
                <b>What Nadia sees</b>One clear next step, with the detail
                behind it when she needs to go deeper.
              </div>
              <div className="phone">
                <div className="phone-screen">
                  <div className="phone-header">
                    <span className="phone-brand">
                      <BrandMark size={17} /> calltime
                    </span>
                    <span className="phone-avatar">NA</span>
                  </div>
                  <div className="phone-greeting">
                    <small>Good afternoon, Nadia</small>
                    <h3>Here is your day.</h3>
                  </div>
                  <div className="phone-date">
                    <span>18 October · Riyadh</span>
                    <strong>Day 02</strong>
                  </div>
                  <div className="phone-timeline">
                    <div className="timeline-item">
                      <small>15:40 · Flight arrival</small>
                      <b>QRH 204 / Terminal 4</b>
                      <span>Driver Omar · +966 55 412 08 19</span>
                    </div>
                    <div className="timeline-item">
                      <small>16:25 · Ground transfer</small>
                      <b>Al Masmak → Artist hotel</b>
                      <span>Vehicle 04 · Plate 7382</span>
                    </div>
                    <div className="timeline-item">
                      <small>17:30 · Accreditation</small>
                      <b>Production entrance / Gate C</b>
                      <span>Scan your CT Global ID</span>
                    </div>
                  </div>
                  <div className="phone-footer">
                    <div className="phone-footer-item active">Today</div>
                    <div className="phone-footer-item">Map</div>
                    <div className="phone-footer-item">Help</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="section roles-section"
          id="roles"
          aria-labelledby="roles-title"
        >
          <div className="container-wide roles-layout">
            <div className="reveal">
              <div className="eyebrow">05 / In the hands of</div>
              <div className="section-heading">
                <h2 id="roles-title">A better day for every team.</h2>
                <p>
                  Different roles need different signals. Calltime keeps the
                  source connected while giving every team their own clear view.
                </p>
              </div>
              <div
                className="role-tabs"
                role="tablist"
                aria-label="Teams using Calltime"
              >
                {roles.map((role) => (
                  <button
                    className={`role-tab ${activeRole === role.name ? "active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeRole === role.name}
                    onClick={() => setActiveRole(role.name)}
                    key={role.name}
                    data-testid={`button-role-${role.name.toLowerCase().replaceAll(" ", "-")}`}
                  >
                    {role.name}{" "}
                    <span>
                      <ChevronRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div
              className="role-panel reveal delay-1"
              role="tabpanel"
              data-testid="panel-active-role"
            >
              <div className="role-panel-top">
                <span className="role-panel-icon">
                  <SelectedRoleIcon size={19} />
                </span>
                <span className="eyebrow">
                  Calltime view / 0
                  {roles.findIndex((role) => role.name === activeRole) + 1}
                </span>
              </div>
              <h3>{selectedRole.title}</h3>
              <p>{selectedRole.description}</p>
              <div className="role-outputs">
                {selectedRole.outputs.map((output) => (
                  <span className="role-output" key={output}>
                    <Check size={11} /> {output}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="section cta-section"
          id="demo"
          aria-labelledby="cta-title"
        >
          <div className="container-wide cta-inner reveal">
            <div>
              <div className="eyebrow eyebrow-dark">
                06 / When the brief gets real
              </div>
              <h2 id="cta-title">
                Make the next show
                <br />
                <em>feel easy.</em>
              </h2>
            </div>
            <div className="cta-side">
              <p>
                Tell us what you are moving. We will show you how Calltime can
                connect it.
              </p>
              <button
                className="button-accent"
                type="button"
                onClick={openDemo}
                data-testid="button-cta-demo"
              >
                Book a private walkthrough <ArrowUpRight size={15} />
              </button>
              <a className="cta-workspace-link" href="/dashboard">
                Or explore the live workspace <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container-wide footer-inner">
          <a className="logo-lockup" href="#top" data-testid="link-footer-logo">
            <span className="logo-mark">
              <BrandMark size={30} />
            </span>
            <span className="logo-word">calltime</span>
            <span className="brand-suffix">global</span>
          </a>
          <span className="footer-copy">
            The operational layer for live entertainment
          </span>
          <div className="footer-links">
            <button
              type="button"
              onClick={openDemo}
              data-testid="button-footer-contact"
            >
              Contact
            </button>
            <a
              className="footer-links"
              href="#top"
              data-testid="link-footer-top"
            >
              Back to top
            </a>
          </div>
        </div>
      </footer>

      {demoOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDemo();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-title"
            data-testid="dialog-demo"
          >
            {!submitted ? (
              <>
                <div className="modal-head">
                  <div>
                    <div className="eyebrow">Private walkthrough</div>
                    <h2 id="demo-title">Let’s talk about your next show.</h2>
                  </div>
                  <button
                    className="modal-close"
                    type="button"
                    aria-label="Close dialog"
                    onClick={closeDemo}
                    data-testid="button-close-demo"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form
                  className="demo-form"
                  onSubmit={handleSubmit}
                  data-testid="form-demo"
                >
                  <label className="demo-label">
                    Work email
                    <input
                      required
                      type="email"
                      placeholder="you@productioncompany.com"
                      data-testid="input-demo-email"
                    />
                  </label>
                  <label className="demo-label">
                    Your role
                    <select
                      defaultValue="producer"
                      data-testid="select-demo-role"
                    >
                      <option value="producer">Producer</option>
                      <option value="tour-manager">Tour manager</option>
                      <option value="venue">Venue team</option>
                      <option value="operations">Operations lead</option>
                    </select>
                  </label>
                  <label className="demo-label">
                    What are you moving?
                    <input
                      required
                      type="text"
                      placeholder="A festival, tour, venue or event series"
                      data-testid="input-demo-event"
                    />
                  </label>
                  <button
                    className="button-accent demo-submit"
                    type="submit"
                    data-testid="button-submit-demo"
                  >
                    Request a walkthrough <ArrowUpRight size={15} />
                  </button>
                </form>
              </>
            ) : (
              <div className="modal-success" data-testid="status-demo-success">
                <div className="modal-success-mark">
                  <Check size={22} />
                </div>
                <div className="eyebrow">Message received</div>
                <h2>We’ll bring the right people in.</h2>
                <p>
                  Someone from the Calltime team will be in touch shortly to
                  find a time that works around your production schedule.
                </p>
                <button
                  className="button-ink"
                  type="button"
                  onClick={closeDemo}
                  data-testid="button-close-success"
                >
                  Back to the site <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div className="mvp-loading">Opening Calltime…</div>}>
      <Switch>
        <WouterRoute path="/p/:token" component={PersonalProfile} />
        <WouterRoute path="/dashboard" component={PhaseOneAdmin} />
        <WouterRoute path="/dashboard-preview" component={Dashboard} />
        <WouterRoute path="/" component={LandingPage} />
      </Switch>
    </Suspense>
  );
}

export default App;
