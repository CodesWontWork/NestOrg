"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

function getValidImage(
  url: string | null | undefined
) {

  if (!url || typeof url !== "string") {
    return "/images/temp-event-image.png";
  }

  if (!url.startsWith("http")) {
    return "/images/temp-event-image.png";
  }

  return url;
}

export default function EventsGrid({
  events,
}: {
  events: Event[];
}) {

  // =========================================
  // HYPE COUNTS
  // =========================================
  const [hypeCounts, setHypeCounts] = useState<{
    [key: string]: number;
  }>({});

  // =========================================
  // FETCH HYPE COUNTS
  // =========================================
  useEffect(() => {

    async function fetchHypeCounts() {

      if (!events.length) return;

      const counts: {
        [key: string]: number;
      } = {};

      await Promise.all(

        events.map(async (event) => {

          const { count } = await supabase
            .from("event_hype")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("event_id", event.id);

          counts[event.id] = count || 0;
        })
      );

      setHypeCounts(counts);
    }

    fetchHypeCounts();

  }, [events]);

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

              {/* IMAGE */}
              <img
                src={getValidImage(event.image_url)}
                alt={event.title}
                className="event-image"
                onError={(e) => {
                  e.currentTarget.src =
                    "/images/temp-event-image.png";
                }}
              />

              {/* TITLE */}
              <h3 className="event-title">
                {event.title}
              </h3>

              {/* DATE */}
              {event.event_date && (
                <p className="event-date">

                  {new Date(
                    event.event_date
                  ).toLocaleDateString(
                    "en-PH",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}

                </p>
              )}

              {/* HYPE */}
              <div className="event-card-hype">
                🔥 {hypeCounts[event.id] || 0} hype
              </div>

              {/* DESCRIPTION */}
              <p className="event-description">
                {event.description}
              </p>

              {/* TAGS */}
              <div className="event-tags">

                {tags.slice(0, 3).map((tag, i) => (
                  <span key={i}>
                    #{tag}
                  </span>
                ))}

              </div>

              {/* ORG */}
              <p className="event-org">
                {event.org_name}
              </p>

            </div>

          </Link>
        );
      })}

    </div>
  );
}