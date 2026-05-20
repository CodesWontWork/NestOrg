"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";

export default function EventsPage() {

  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;

  // =========================
  // EVENTS DATA
  // =========================
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setEvents(data || []);
      setLoading(false);
    }

    fetchEvents();
  }, []);

  // =========================
  // SEARCH STATE
  // =========================
  const [search, setSearch] = useState("");

  const filteredEvents = events.filter((event) => {

    const titleMatch =
      event.title?.toLowerCase().includes(search.toLowerCase());

    const tagsMatch =
      Array.isArray(event.tags)
        ? event.tags.join(" ").toLowerCase().includes(search.toLowerCase())
        : (event.tags || "")
            .toLowerCase()
            .includes(search.toLowerCase());

    return titleMatch || tagsMatch;
  });
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

  return (
    <main>

      <Header />

      {/* ========================= SEARCH ========================= */}
      <section className="events-search-container">

        <input
          className="events-search-input"
          type="text"
          placeholder="Search events or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link href="/events/create" className="events-add-btn">
          + Add Event
        </Link>

      </section>

      <div id="Events-grid-box">
        <EventsGrid events={events}/>
      </div>

     <Footer />

    </main>
  );
}