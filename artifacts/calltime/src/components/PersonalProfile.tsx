import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hotel,
  LoaderCircle,
  MapPin,
  Plane,
  QrCode,
  ShieldCheck,
  Truck,
} from "lucide-react";
import BrandMark from "./BrandMark";
import { supabase } from "../lib/supabase";

type Profile = Record<string, any>;

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDate(value?: string, timezone?: string) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: timezone || undefined,
  }).format(new Date(value));
}

export default function PersonalProfile() {
  const [, params] = useRoute("/p/:token");
  const token = params?.token ?? "";
  const storageKey = `ct-session-${token.slice(0, 12)}`;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const existingSession = sessionStorage.getItem(storageKey);
      const body = existingSession
        ? { action: "profile", sessionToken: existingSession }
        : { action: "redeem", token };
      const { data, error: invokeError } = await supabase.functions.invoke("personal-profile", { body });
      if (!active) return;
      if (invokeError || data?.error) {
        setError(data?.error ?? invokeError?.message ?? "Unable to open this link");
      } else {
        if (data.sessionToken) sessionStorage.setItem(storageKey, data.sessionToken);
        setProfile(data.profile);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [storageKey, token]);

  if (loading) return <main className="profile-state"><BrandMark size={48} /><LoaderCircle className="spin" /><p>Opening your secure Calltime profile…</p></main>;
  if (error || !profile) return <main className="profile-state error"><BrandMark size={48} /><ShieldCheck size={30} /><h1>Link unavailable</h1><p>{error}</p><small>Contact your event operations team for a fresh personal link.</small></main>;

  const person = Array.isArray(profile.people) ? profile.people[0] : profile.people;
  const event = Array.isArray(profile.events) ? profile.events[0] : profile.events;
  const role = Array.isArray(profile.event_roles) ? profile.event_roles[0] : profile.event_roles;
  const flights = asArray(profile.flights);
  const transport = asArray(profile.ground_transport);
  const hotels = asArray(profile.hotel_bookings);
  const accreditation = asArray(profile.accreditations)[0] as any;
  const nextFlight = flights[0] as any;
  const nextTransport = transport[0] as any;
  const hotel = hotels[0] as any;

  return (
    <main className="personal-profile-page">
      <header className="profile-topbar">
        <a href="/" className="profile-brand"><BrandMark size={30} /><b>calltime</b><small>global</small></a>
        <span><ShieldCheck size={13} /> Secure profile</span>
      </header>

      <section className="profile-hero">
        <div className="profile-event-line"><span>LIVE EVENT</span><i /></div>
        <p>Welcome, {person?.full_name?.split(" ")[0]}</p>
        <h1>Here is your day.</h1>
        <div className="profile-event-card">
          <span className="profile-date-icon"><CalendarDays size={19} /></span>
          <div><b>{event?.name}</b><span>{event?.venue_name ?? event?.city}</span></div>
          <time>{formatDate(event?.starts_at, event?.timezone).split(",")[0]}</time>
        </div>
      </section>

      <section className="profile-content">
        <div className="profile-identity-strip">
          <span className="profile-person-avatar">{person?.full_name?.split(" ").map((part: string) => part[0]).slice(0, 2).join("")}</span>
          <div><small>CT GLOBAL ID</small><b>{person?.full_name}</b><span>{role?.label ?? "Event attendee"}</span></div>
          <CheckCircle2 size={20} />
        </div>

        <div className="profile-section-title"><span>YOUR LOGISTICS</span><small>Live event information</small></div>
        <div className="profile-logistics-list">
          <article className={!nextFlight ? "pending" : ""}>
            <span className="profile-item-icon flight"><Plane size={18} /></span>
            <div><small>{nextFlight?.direction ?? "Flight"}</small><h2>{nextFlight ? `${nextFlight.airline ?? ""} ${nextFlight.flight_number ?? ""}` : "Flight details pending"}</h2><p>{nextFlight ? `${nextFlight.origin_airport ?? "—"} → ${nextFlight.destination_airport ?? "—"}` : "Operations will update this section."}</p></div>
            <time>{nextFlight ? formatDate(nextFlight.estimated_at ?? nextFlight.scheduled_at, event?.timezone) : "Pending"}</time>
          </article>
          <article className={!nextTransport ? "pending" : ""}>
            <span className="profile-item-icon transport"><Truck size={18} /></span>
            <div><small>Ground transport</small><h2>{nextTransport?.pickup_location ?? "Transfer pending"}</h2><p>{nextTransport ? `To ${nextTransport.dropoff_location ?? "venue"}${nextTransport.driver_name ? ` · Driver ${nextTransport.driver_name}` : ""}` : "Your driver details will appear here."}</p></div>
            <time>{nextTransport ? formatDate(nextTransport.scheduled_pickup_at, event?.timezone) : "Pending"}</time>
          </article>
          <article className={!hotel ? "pending" : ""}>
            <span className="profile-item-icon hotel"><Hotel size={18} /></span>
            <div><small>Hotel</small><h2>{hotel?.hotel_name ?? "Hotel pending"}</h2><p>{hotel ? `${hotel.room_type ?? "Room assigned"}${hotel.confirmation_number ? ` · Ref ${hotel.confirmation_number}` : ""}` : "Operations will update this section."}</p></div>
            <time>{hotel ? `${hotel.check_in_date} → ${hotel.check_out_date}` : "Pending"}</time>
          </article>
        </div>

        {profile.call_time && <div className="profile-calltime"><Clock3 size={19} /><div><small>YOUR CALL TIME</small><b>{formatDate(profile.call_time, event?.timezone)}</b></div><MapPin size={17} /></div>}

        <section className="profile-accreditation">
          <div><span>ACCREDITATION</span><h2>Your badge collection code.</h2><p>Show this QR code at the accreditation desk. Do not share it with anyone else.</p><div className={`profile-badge-state ${accreditation?.status ?? "pending"}`}><i /> {accreditation?.status ?? "Pending"} · {accreditation?.badge_type ?? "Event access"}</div></div>
          <div className="profile-qr">
            {accreditation?.qr_code_value ? <QRCodeSVG value={accreditation.qr_code_value} size={148} level="H" marginSize={1} /> : <QrCode size={78} />}
            <small>{accreditation?.qr_code_value ? "READY TO SCAN" : "QR PENDING"}</small>
          </div>
        </section>

        <footer className="profile-footer"><BrandMark size={22} /><span>Information updates automatically. Refresh this page if your plans change.</span></footer>
      </section>
    </main>
  );
}
