"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";

export default function EventsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const eventsWithHype = await Promise.all(
        (data || []).map(async (event) => {
          const { count } = await supabase
            .from("event_hype")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("event_id", event.id);

          return {
            ...event,
            hype_count: count || 0,
          };
        }),
      );

      setEvents(eventsWithHype);

      setLoading(false);
    }

    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    let filtered = events.filter((event) => {
      const titleMatch = event.title
        ?.toLowerCase()
        .includes(search.toLowerCase());

      const tagsMatch = Array.isArray(event.tags)
        ? event.tags.join(" ").toLowerCase().includes(search.toLowerCase())
        : (event.tags || "").toLowerCase().includes(search.toLowerCase());

      return titleMatch || tagsMatch;
    });

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

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, username")
        .eq("id", user.id)
        .single();

      setProfile(data);
    }

    loadProfile();
  }, [user]);

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

        {error && <p>{error}</p>}

        {!loading && !error && <EventsGrid events={filteredEvents} />}
      </div>

      <Footer />
    </main>
  );
}
