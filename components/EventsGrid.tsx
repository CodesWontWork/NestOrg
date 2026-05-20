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
};

function getValidImage(url: string | null | undefined) {
  if (!url || typeof url !== "string") return "/images/temp-event-image.png";
  if (!url.startsWith("http")) return "/images/temp-event-image.png";
  return url;
}

export default function EventsGrid({ events }: { events: Event[] }) {
  return (
    <div id="uec-events">

      {events.map((event) => {
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

        return (
          <Link
            key={event.id}
            href={`/events/${event.slug || event.id}`}
            className="home-event-card-link"
          >
            <div className="home-event-card">

              <img
                src={getValidImage(event.image_url)}
                alt={event.title}
                className="event-image"
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

              <p className="event-description">{event.description}</p>

              <div className="event-tags">
                {tags.slice(0, 3).map((tag, i) => (
                  <span key={i}>#{tag}</span>
                ))}
              </div>

              <p className="event-org">{event.org_name}</p>

            </div>
          </Link>
        );
      })}

    </div>
  );
}