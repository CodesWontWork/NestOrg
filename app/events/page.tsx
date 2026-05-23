"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";

type Event = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  event_date?: string;
  tags?: string[];
  created_at?: string;
  created_by?: string;
  slug?: string;
  org_name?: string;
  hype_count?: number;
  creator_username?: string;
  creator_avatar?: string;
};

type Profile = {
  id: string;
  username?: string;
  avatar_url?: string;
};

export default function EventsPage() {
  const [session, setSession] = useState<Session | null>(null);

  const [events, setEvents] = useState<Event[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState("created");

  const [sortDirection, setSortDirection] = useState("desc");

  const user = session?.user ?? null;

  // =========================
  // SESSION
  // =========================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // =========================
  // FETCH EVENTS
  // =========================
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);

        setError("");

        // =========================
        // EVENTS QUERY
        // =========================
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select(
            `
              id,
              title,
              description,
              image_url,
              event_date,
              tags,
              created_at,
              created_by,
              slug,
              org_name
            `,
          )
          .eq("approved", true)
          .order("created_at", { ascending: false });

        if (eventsError) {
          throw eventsError;
        }

        const cleanedEvents: Event[] = (eventsData || []).map((event) => {
          let parsedTags: string[] = [];

          try {
            if (Array.isArray(event.tags)) {
              parsedTags = event.tags;
            } else if (typeof event.tags === "string") {
              const parsed = JSON.parse(event.tags);

              parsedTags = Array.isArray(parsed) ? parsed : [event.tags];
            }
          } catch {
            parsedTags = [];
          }

          return {
            ...event,
            tags: parsedTags,
          };
        });

        // =========================
        // GET USER IDS
        // =========================
        const userIds = [
          ...new Set(
            cleanedEvents.map((event) => event.created_by).filter(Boolean),
          ),
        ] as string[];

        // =========================
        // FETCH PROFILES
        // =========================
        let profileMap: Record<string, Profile> = {};

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds);

          profileMap = (profiles || []).reduce(
            (acc: Record<string, Profile>, profile: Profile) => {
              acc[profile.id] = profile;

              return acc;
            },
            {},
          );
        }

        // =========================
        // FETCH HYPE COUNTS
        // =========================
        const { data: hypeData } = await supabase
          .from("event_hype")
          .select("event_id");

        const hypeMap: Record<string, number> = {};

        (hypeData || []).forEach((hype) => {
          hypeMap[hype.event_id] = (hypeMap[hype.event_id] || 0) + 1;
        });

        // =========================
        // MERGE DATA
        // =========================
        const enrichedEvents: Event[] = cleanedEvents.map((event) => {
          const profile = event.created_by
            ? profileMap[event.created_by]
            : undefined;

          return {
            ...event,

            hype_count: hypeMap[event.id] || 0,

            creator_username: profile?.username || null,

            creator_avatar: profile?.avatar_url || null,
          };
        });

        setEvents(enrichedEvents);
      } catch (err: any) {
        console.error(err);

        setError(err.message || "Failed to load events.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // =========================
  // FILTER + SORT
  // =========================
  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();

    let filtered = [...events];

    // =========================
    // SEARCH
    // =========================
    if (q) {
      filtered = filtered.filter((event) => {
        const titleMatch = event.title?.toLowerCase().includes(q);

        const tagsMatch = (event.tags || [])
          .join(" ")
          .toLowerCase()
          .includes(q);

        return titleMatch || tagsMatch;
      });
    }

    // =========================
    // SORT
    // =========================
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "alphabetical") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "event_date") {
        comparison =
          new Date(a.event_date || 0).getTime() -
          new Date(b.event_date || 0).getTime();
      } else if (sortBy === "created") {
        comparison =
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime();
      } else if (sortBy === "popularity") {
        comparison = (a.hype_count || 0) - (b.hype_count || 0);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [events, search, sortBy, sortDirection]);

  return (
    <main>
      <Header />

      <section className="events-search-container">
        <input
          className="events-search-input"
          type="text"
          placeholder="Search events or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="events-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created">Created Date</option>

          <option value="event_date">Event Date</option>

          <option value="alphabetical">A-Z</option>

          <option value="popularity">Popularity</option>
        </select>

        <select
          className="events-sort-select"
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value)}
        >
          <option value="desc">Descending</option>

          <option value="asc">Ascending</option>
        </select>

        <Link href="/events/create" className="events-add-btn">
          + Add Event
        </Link>
      </section>

      <div id="Events-grid-box">
        {loading && <p>Loading events...</p>}

        {!loading && error && <p>{error}</p>}

        {!loading && !error && <EventsGrid events={filteredEvents} />}
      </div>

      <Footer />
    </main>
  );
}
