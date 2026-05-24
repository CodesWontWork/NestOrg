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
  creator_username?: string | null;
  creator_avatar?: string | null;
};

type Profile = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
};

export default function EventsPage() {
  // Store logged in session
  const [session, setSession] = useState<Session | null>(null);

  // Store all fetched events
  const [events, setEvents] = useState<Event[]>([]);

  // Loading state while fetching data
  const [loading, setLoading] = useState(true);

  // Error message state
  const [error, setError] = useState("");

  // Search input state
  const [search, setSearch] = useState("");

  // Selected sorting option
  const [sortBy, setSortBy] = useState("created");

  // Sort direction state
  const [sortDirection, setSortDirection] = useState("desc");

  // Listen for auth session changes
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

  // Fetch all approved events
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);

        setError("");

        // Get approved events from database
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

        // Clean and format event data
        const cleanedEvents: Event[] = (eventsData || []).map(
          (event): Event => {
            let parsedTags: string[] = [];

            try {
              // Handle tags if already array
              if (Array.isArray(event.tags)) {
                parsedTags = event.tags as string[];
              }

              // Handle tags if stored as JSON string
              else if (typeof event.tags === "string") {
                const parsed = JSON.parse(event.tags);

                parsedTags = Array.isArray(parsed)
                  ? (parsed as string[])
                  : [event.tags];
              }
            } catch {
              parsedTags = [];
            }

            return {
              id: String(event.id),
              title: event.title || "",
              description: event.description || "",
              image_url: event.image_url || "",
              event_date: event.event_date || "",
              created_at: event.created_at || "",
              created_by: event.created_by || "",
              slug: event.slug || "",
              org_name: event.org_name || "",
              tags: parsedTags,
              hype_count: 0,
              creator_username: null,
              creator_avatar: null,
            };
          },
        );

        // Get all unique creator IDs
        const userIds = [
          ...new Set(
            cleanedEvents
              .map((event) => event.created_by)
              .filter(
                (id): id is string => typeof id === "string" && id.length > 0,
              ),
          ),
        ];

        // Store user profiles by ID
        const profileMap: Record<string, Profile> = {};

        // Fetch creator profiles
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds);

          (profiles || []).forEach((profile: Profile) => {
            profileMap[profile.id] = profile;
          });
        }

        // Fetch hype records
        const { data: hypeData } = await supabase
          .from("event_hype")
          .select("event_id");

        // Store hype count per event
        const hypeMap: Record<string, number> = {};

        (hypeData || []).forEach((hype: { event_id: string }) => {
          hypeMap[hype.event_id] = (hypeMap[hype.event_id] || 0) + 1;
        });

        // Merge profile data and hype counts into events
        const enrichedEvents: Event[] = cleanedEvents.map((event): Event => {
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

        // Save final events
        setEvents(enrichedEvents);
      } catch (err: unknown) {
        console.error(err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load events.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Filter and sort events
  const filteredEvents: Event[] = useMemo(() => {
    const q = search.toLowerCase().trim();

    let filtered = [...events];

    // Search by title or tags
    if (q) {
      filtered = filtered.filter((event) => {
        const titleMatch = event.title.toLowerCase().includes(q);

        const tagsMatch = (event.tags || [])
          .join(" ")
          .toLowerCase()
          .includes(q);

        return titleMatch || tagsMatch;
      });
    }

    // Sort events
    filtered.sort((a, b) => {
      let comparison = 0;

      // Sort alphabetically
      if (sortBy === "alphabetical") {
        comparison = a.title.localeCompare(b.title);
      }

      // Sort by event date
      else if (sortBy === "event_date") {
        comparison =
          new Date(a.event_date || 0).getTime() -
          new Date(b.event_date || 0).getTime();
      }

      // Sort by created date
      else if (sortBy === "created") {
        comparison =
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime();
      }

      // Sort by hype count
      else if (sortBy === "popularity") {
        comparison = (a.hype_count || 0) - (b.hype_count || 0);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [events, search, sortBy, sortDirection]);

  return (
    <main>
      <Header />

      {/* Search and sort controls */}
      <section className="events-search-container">
        <input
          className="events-search-input"
          type="text"
          placeholder="Search events or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Sort type dropdown */}
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

        {/* Sort direction dropdown */}
        <select
          className="events-sort-select"
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value)}
        >
          <option value="desc">Descending</option>

          <option value="asc">Ascending</option>
        </select>

        {/* Button to create new event */}
        <Link href="/events/create" className="events-add-btn">
          + Add Event
        </Link>
      </section>

      {/* Events container */}
      <div id="Events-grid-box">
        {/* Loading message */}
        {loading && <p>Loading events...</p>}

        {/* Error message */}
        {!loading && error && <p>{error}</p>}

        {/* Display event grid */}
        {!loading && !error && <EventsGrid events={filteredEvents as any[]} />}
      </div>

      <Footer />
    </main>
  );
}
