"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";

export default function Home() {
  // Stores possible fetch errors
  const [error, setError] = useState("");

  // Controls loading state
  const [loading, setLoading] = useState(true);

  // Stores total event count
  const [eventCount, setEventCount] = useState(0);

  // Stores total organization count
  const [orgCount, setOrgCount] = useState(0);

  // Stores total user count
  const [userCount, setUserCount] = useState(0);

  // Stores current/upcoming homepage events
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);

  // Stores past homepage events
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  // Today's date in ISO format for date comparisons
  const today = new Date().toISOString().split("T")[0];

  // Loads homepage data on first render
  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);

      // Fetch 3 latest approved current/upcoming events
      const { data: currentData, error: currentError } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(3);

      if (currentError) {
        setError(currentError.message);
        setLoading(false);
        return;
      }

      // Fetch 3 latest approved past events
      const { data: pastData, error: pastError } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .lt("event_date", today)
        .order("event_date", { ascending: false })
        .limit(3);

      if (pastError) {
        setError(pastError.message);
        setLoading(false);
        return;
      }

      // Enrich a list of events with hype count and creator info
      async function enrichEvents(events: any[]) {
        return Promise.all(
          (events || []).map(async (event) => {
            // Get hype count of event
            const { count } = await supabase
              .from("event_hype")
              .select("*", { count: "exact", head: true })
              .eq("event_id", event.id);

            // Default creator info
            let creator_username = null;
            let creator_avatar = null;

            // Fetch creator profile if event has creator
            if (event.created_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, avatar_url")
                .eq("id", event.created_by)
                .single();

              creator_username = profile?.username || null;
              creator_avatar = profile?.avatar_url || null;
            }

            // Return enriched event object
            return {
              ...event,
              hype_count: count || 0,
              creator_username,
              creator_avatar,
            };
          }),
        );
      }

      // Enrich both event lists
      const [enrichedCurrent, enrichedPast] = await Promise.all([
        enrichEvents(currentData),
        enrichEvents(pastData),
      ]);

      setCurrentEvents(enrichedCurrent);
      setPastEvents(enrichedPast);

      // Load site statistics
      const [eventsRes, orgsRes, usersRes] = await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("approved", true),

        supabase
          .from("organizations")
          .select("*", { count: "exact", head: true })
          .eq("approved", true),

        supabase.from("profiles").select("*", {
          count: "exact",
          head: true,
        }),
      ]);

      // Save counts into state
      setEventCount(eventsRes.count || 0);
      setOrgCount(orgsRes.count || 0);
      setUserCount(usersRes.count || 0);

      setLoading(false);
    }

    loadHomeData();
  }, []);

  // Returns fallback image if invalid
  function getValidImage(url: string | null | undefined) {
    if (!url || typeof url !== "string") {
      return "/images/temp-event-image.png";
    }

    if (!url.startsWith("http")) {
      return "/images/temp-event-image.png";
    }

    return url;
  }

  // Reference for parallax image
  const imageRef = useRef<HTMLImageElement>(null);

  // Handles parallax mouse movement effect
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;

      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      // Move image slightly with mouse
      if (imageRef.current) {
        imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
      }
    }

    // Add mouse listener
    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Scroll-reveal: watches .reveal/.reveal-left/.reveal-right elements
  // and adds .visible when they enter the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.15 },
    );

    document
      .querySelectorAll(".reveal, .reveal-left, .reveal-right")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading]); // re-run after loading so dynamically rendered cards are caught

  return (
    <main>
      {/* Top navigation */}
      <Header />

      {/* Hero section with parallax image */}
      <section className="parallax-image-container">
        <img
          ref={imageRef}
          src="/images/parallax-image.jpg"
          alt=""
          className="parallax-image"
        />

        <div className="parallax-image-text">
          <h2>Welcome to NestOrg</h2>

          <p>
            Your central hub for organizations and events at Cavite State
            University
          </p>
        </div>
      </section>

      {/* Website statistics section */}
      <section id="random-ahh-container">
        <div className="rac-boxes reveal reveal-delay-1">
          <img className="icon" src="/images/event_icon.svg" alt="" />

          <div>
            <h3>{eventCount}</h3>

            <p>Events</p>
          </div>
        </div>

        <div className="rac-boxes reveal reveal-delay-2">
          <img className="icon" src="/images/organization-icon.svg" alt="" />

          <div>
            <h3>{orgCount}</h3>

            <p>Organizations</p>
          </div>
        </div>

        <div className="rac-boxes reveal reveal-delay-3">
          <img className="icon" src="/images/profile-icon.svg" alt="" />

          <div>
            <h3>{userCount}</h3>

            <p>Users</p>
          </div>
        </div>
      </section>

      {/* Homepage events section */}
      <section id="home-events-section">
        {/* Loading message */}
        {loading && <p>Loading events...</p>}

        {/* Error message */}
        {!loading && error && <p>{error}</p>}

        {!loading && !error && (
          <>
            {/* Current / upcoming events */}
            <div id="uec-heading" className="reveal">
              <div>
                <h3>Upcoming Events</h3>
                <p>Check out current events!</p>
              </div>
              <Link href="/events">View All Events</Link>
            </div>

            {currentEvents.length > 0 ? (
              <EventsGrid events={currentEvents} />
            ) : (
              <p
                style={{ padding: "20px 0", color: "var(--text-black-light)" }}
              >
                No upcoming events right now.
              </p>
            )}

            {/* Past events */}
            {pastEvents.length > 0 && (
              <>
                <div id="uec-heading" className="reveal">
                  <div>
                    <h3>Past Events</h3>
                    <p>Events that have already happened.</p>
                  </div>
                </div>

                <EventsGrid events={pastEvents} />
              </>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
