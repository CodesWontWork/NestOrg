"use client";

import Link from "next/link";

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

  // =========================
  // CREATOR
  // =========================
  created_by?: string;
  creator_username?: string;
};

function getValidImage(url: string | null | undefined) {
  if (!url || typeof url !== "string") {
    return "/images/temp-event-image.png";
  }

  if (!url.startsWith("http")) {
    return "/images/temp-event-image.png";
  }

  return url;
}

export default function EventsGrid({ events }: { events: Event[] }) {
  // =========================
  // TODAY STRING
  // =========================
  const today = new Date().toISOString().split("T")[0];

  // =========================
  // SPLIT EVENTS
  // =========================
  const upcomingEvents = events.filter((event) => {
    if (!event.event_date) {
      return true;
    }

    return event.event_date >= today;
  });

  const pastEvents = events.filter((event) => {
    if (!event.event_date) {
      return false;
    }

    return event.event_date < today;
  });

  // =========================
  // SORT PAST EVENTS
  // =========================
  pastEvents.sort((a, b) => {
    return (
      new Date(b.event_date || "").getTime() -
      new Date(a.event_date || "").getTime()
    );
  });

  // =========================
  // RENDER CARD
  // =========================
  function renderEventCard(event: Event) {
    let tags: string[] = [];

    try {
      if (Array.isArray(event.tags)) {
        tags = event.tags;
      } else if (event.tags) {
        tags = JSON.parse(event.tags);
      }
    } catch {
      tags = [];
    }

    const isPast = event.event_date && event.event_date < today;

    return (
      <Link
        key={event.id}
        href={`/events/${event.slug || event.id}`}
        className="home-event-card-link"
      >
        <div className="home-event-card">
          {/* PAST BADGE */}
          {isPast && <div className="event-past-badge">Past Event</div>}

          {/* IMAGE */}
          <img
            src={getValidImage(event.image_url)}
            alt={event.title}
            className="event-image"
            onError={(e) => {
              e.currentTarget.src = "/images/temp-event-image.png";
            }}
          />

          {/* TITLE */}
          <h3 className="event-title">{event.title}</h3>

          {/* DATE */}
          {event.event_date && (
            <p className="event-date">
              {new Date(event.event_date).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

          {/* HYPE */}
          <div className="event-card-hype">🔥 {event.hype_count || 0} hype</div>

          {/* DESCRIPTION */}
          <p className="event-description">{event.description}</p>

          {/* TAGS */}
          <div className="event-tags">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i}>#{tag}</span>
            ))}
          </div>

          {/* ORG */}
          <p className="event-org">{event.org_name}</p>

          {/* CREATOR */}
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
      {/* CURRENT EVENTS */}
      {upcomingEvents.length > 0 && (
        <>
          <h2 className="events-grid-title">Current Events</h2>

          <div id="uec-events">{upcomingEvents.map(renderEventCard)}</div>
        </>
      )}

      {/* PAST EVENTS */}
      {pastEvents.length > 0 && (
        <>
          <h2 className="events-grid-title past-title">Past Events</h2>

          <div id="uec-events">{pastEvents.map(renderEventCard)}</div>
        </>
      )}
    </div>
  );
}
