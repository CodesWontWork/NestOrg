"use client";

import Link from "next/link";
import { useMemo } from "react";

type Event = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  image_url?: string;
  event_date?: string;
  tags?: string[] | string;
  org_name?: string;
  hype_count?: number;
  created_by?: string;
  creator_username?: string;
};

function getValidImage(url?: string) {
  if (!url || typeof url !== "string") return "/images/temp-event-image.png";
  if (!url.startsWith("http")) return "/images/temp-event-image.png";
  return url;
}

// =========================
// SAFE TAG PARSER (IMPORTANT FIX)
// =========================
function parseTags(tags: string[] | string | undefined): string[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === "string");
  }

  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {}

  return [];
}

export default function EventsGrid({ events }: { events: Event[] }) {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    for (const event of events) {
      if (!event.event_date || event.event_date >= today) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }

    past.sort(
      (a, b) =>
        new Date(b.event_date || "").getTime() -
        new Date(a.event_date || "").getTime(),
    );

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events, today]);

  function renderCard(event: Event) {
    const tags: string[] = parseTags(event.tags);

    const isPast = !!event.event_date && event.event_date < today;

    return (
      <Link
        key={event.id}
        href={`/events/${event.slug || event.id}`}
        className="home-event-card-link"
      >
        <div className="home-event-card">
          {isPast && <div className="event-past-badge">Past Event</div>}

          <img
            src={getValidImage(event.image_url)}
            className="event-image"
            loading="lazy"
            decoding="async"
            alt={event.title}
            onError={(e) => {
              e.currentTarget.src = "/images/temp-event-image.png";
            }}
          />

          <h3 className="event-title">{event.title}</h3>

          {event.event_date && (
            <p className="event-date">
              {new Date(event.event_date).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

          <div className="event-card-hype">🔥 {event.hype_count || 0} hype</div>

          <p className="event-description">{event.description}</p>

          <div className="event-tags">
            {tags.slice(0, 3).map((t: string, i: number) => (
              <span key={i}>#{t}</span>
            ))}
          </div>

          <p className="event-org">{event.org_name}</p>

          {event.creator_username && (
            <Link
              href={`/profile/${event.creator_username}`}
              className="event-creator"
              onClick={(e) => e.stopPropagation()}
            >
              {event.creator_username}
            </Link>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="events-grid-wrapper">
      {upcomingEvents.length > 0 && (
        <>
          <h2 className="events-grid-title">Current Events</h2>
          <div id="uec-events">{upcomingEvents.map(renderCard)}</div>
        </>
      )}

      {pastEvents.length > 0 && (
        <>
          <h2 className="events-grid-title past-title">Past Events</h2>
          <div id="uec-events">{pastEvents.map(renderCard)}</div>
        </>
      )}
    </div>
  );
}
