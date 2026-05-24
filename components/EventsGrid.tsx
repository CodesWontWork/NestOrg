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

// Returns fallback image if URL is invalid
function getValidImage(url?: string) {
  if (!url || typeof url !== "string") {
    return "/images/temp-event-image.png";
  }

  if (!url.startsWith("http")) {
    return "/images/temp-event-image.png";
  }

  return url;
}

// Converts tags safely into an array
function parseTags(tags: string[] | string | undefined): string[] {
  // Return empty array if no tags exist
  if (!tags) return [];

  // Already an array
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === "string");
  }

  // Try parsing JSON string
  try {
    const parsed = JSON.parse(tags);

    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    // Ignore broken JSON
  }

  return [];
}

export default function EventsGrid({ events }: { events: Event[] }) {
  // Gets today's date for event comparisons
  const today = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Separates upcoming and past events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];

    const past: Event[] = [];

    // Loop through all events
    for (const event of events) {
      // Event is upcoming if date is today or later
      if (!event.event_date || event.event_date >= today) {
        upcoming.push(event);
      } else {
        // Otherwise place into past events
        past.push(event);
      }
    }

    // Sort past events from newest to oldest
    past.sort(
      (a, b) =>
        new Date(b.event_date || "").getTime() -
        new Date(a.event_date || "").getTime(),
    );

    return {
      upcomingEvents: upcoming,
      pastEvents: past,
    };
  }, [events, today]);

  // Renders a single event card
  function renderCard(event: Event) {
    // Parse event tags safely
    const tags: string[] = parseTags(event.tags);

    // Checks if event already happened
    const isPast = !!event.event_date && event.event_date < today;

    return (
      <Link
        key={event.id}
        href={`/events/${event.slug || event.id}`}
        className="home-event-card-link"
      >
        <div className="home-event-card">
          {/* Past event badge */}
          {isPast && <div className="event-past-badge">Past Event</div>}

          {/* Event image */}
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

          {/* Event title */}
          <h3 className="event-title">{event.title}</h3>

          {/* Event date */}
          {event.event_date && (
            <p className="event-date">
              {new Date(event.event_date).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

          {/* Hype count */}
          <div className="event-card-hype">🔥 {event.hype_count || 0} hype</div>

          {/* Short description */}
          <p className="event-description">{event.description}</p>

          {/* Event tags */}
          <div className="event-tags">
            {tags.slice(0, 3).map((t: string, i: number) => (
              <span key={i}>#{t}</span>
            ))}
          </div>

          {/* Organization name */}
          <p className="event-org">{event.org_name}</p>

          {/* Creator username */}
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
      {/* Current events section */}
      {upcomingEvents.length > 0 && (
        <>
          <h2 className="events-grid-title">Current Events</h2>

          <div id="uec-events">{upcomingEvents.map(renderCard)}</div>
        </>
      )}

      {/* Past events section */}
      {pastEvents.length > 0 && (
        <>
          <h2 className="events-grid-title past-title">Past Events</h2>

          <div id="uec-events">{pastEvents.map(renderCard)}</div>
        </>
      )}
    </div>
  );
}
