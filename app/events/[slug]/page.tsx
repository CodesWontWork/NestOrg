"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();

  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  // =========================
  // AUTH
  // =========================
  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;

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
  // EVENT STATE
  // =========================
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // HYPE STATE
  // =========================
  const [hypeCount, setHypeCount] = useState(0);
  const [hasHyped, setHasHyped] = useState(false);

  // =========================
  // FETCH EVENT
  // =========================
  useEffect(() => {
    async function fetchEvent() {
      if (!slug) return;

      setLoading(true);

      let { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        const fallback = await supabase
          .from("events")
          .select("*")
          .eq("id", slug)
          .single();

        data = fallback.data;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      setEvent(data);

      // =========================
      // FETCH HYPE COUNT
      // =========================
      const { count } = await supabase
        .from("event_hype")
        .select("*", { count: "exact", head: true })
        .eq("event_id", data.id);

      setHypeCount(count || 0);

      // =========================
      // CHECK USER HYPE
      // =========================
      if (user) {
        const { data: hypeData } = await supabase
          .from("event_hype")
          .select("*")
          .eq("event_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();

        setHasHyped(!!hypeData);
      }

      setLoading(false);
    }

    fetchEvent();
  }, [slug, user]);

  // =========================
  // TOGGLE HYPE
  // =========================
  async function toggleHype() {
    if (!user || !event) return;

    if (hasHyped) {

      // REMOVE HYPE
      await supabase
        .from("event_hype")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", user.id);

      setHasHyped(false);
      setHypeCount((prev) => prev - 1);

    } else {

      // ADD HYPE
      const { error } = await supabase
        .from("event_hype")
        .insert({
          event_id: event.id,
          user_id: user.id,
        });

      if (!error) {
        setHasHyped(true);
        setHypeCount((prev) => prev + 1);
      }
    }
  }

  // =========================
  // TAGS SAFE PARSE
  // =========================
  let parsedTags: string[] = [];

  try {
    parsedTags = Array.isArray(event?.tags)
      ? event.tags
      : JSON.parse(event?.tags || "[]");
  } catch {
    parsedTags = [];
  }

  // =========================
  // IMAGE SAFE
  // =========================
  function getImage(url: string) {
    if (!url || !url.startsWith("http")) {
      return "/images/temp-event-image.png";
    }

    return url;
  }

  if (loading) return <p>Loading...</p>;
  if (!event) return <p>Event not found</p>;

  return (
    <main>

      <Header />

      <section className="event-page-section">
        <div className="event-page-container">

          <img
            src={getImage(event.image_url)}
            className="event-page-image"
            alt={event.title}
          />

          <div className="event-content">

            <h1 className="event-title">
              {event.title}
            </h1>

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
            <div className="event-hype-section">

              

              <p className="event-hype-count">
                {hypeCount} hype
              </p>

              <button
                className={`event-hype-btn ${hasHyped ? "hyped" : ""}`}
                onClick={toggleHype}
                disabled={!user}
              >
                {hasHyped ? "Hyped" : "Add Hype"}
              </button>

            </div>

            <p className="event-description">
              {event.description}
            </p>

            {/* TAGS */}
            <div className="event-tags">
              {parsedTags.map((t, i) => (
                <span key={i}>#{t}</span>
              ))}
            </div>

          </div>

        </div>
      </section>

      <Footer />

    </main>
  );
}