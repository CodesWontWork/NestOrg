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

  // Stores homepage events
  const [events, setEvents] = useState<any[]>([]);

  // Loads homepage data on first render
  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);

      // Fetch latest approved events
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Add extra event info
      const eventsWithData = await Promise.all(
        (data || []).map(async (event) => {
          // Get hype count of event
          const { count } = await supabase
            .from("event_hype")
            .select("*", {
              count: "exact",
              head: true,
            })
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

      // Save events into state
      setEvents(eventsWithData);

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
        <div id="uec-heading" className="reveal">
          <div>
            <h3>Events</h3>

            <p>Check out current events!</p>
          </div>

          <Link href="/events">View All Events</Link>
        </div>

        {/* Loading message */}
        {loading && <p>Loading events...</p>}

        {/* Error message */}
        {!loading && error && <p>{error}</p>}

        {/* Events grid */}
        {!loading && !error && <EventsGrid events={events} />}
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
