"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";

export default function Home() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [eventCount, setEventCount] = useState(0);
  const [orgCount, setOrgCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

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

      const eventsWithData = await Promise.all(
        (data || []).map(async (event) => {
          // =========================
          // HYPE COUNT
          // =========================
          const { count } = await supabase
            .from("event_hype")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("event_id", event.id);

          // =========================
          // CREATOR PROFILE
          // =========================
          let creator_username = null;
          let creator_avatar = null;

          if (event.created_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", event.created_by)
              .single();

            creator_username = profile?.username || null;
            creator_avatar = profile?.avatar_url || null;
          }

          return {
            ...event,

            // hype
            hype_count: count || 0,

            // creator
            creator_username,
            creator_avatar,
          };
        }),
      );

      setEvents(eventsWithData);

      setLoading(false);
    }

    fetchEvents();

    async function loadCounts() {
      const [eventsRes, orgsRes, usersRes] = await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("approved", true),
        supabase
          .from("organizations")
          .select("*", { count: "exact", head: true })
          .eq("approved", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      setEventCount(eventsRes.count || 0);
      setOrgCount(orgsRes.count || 0);
      setUserCount(usersRes.count || 0);
    }

    loadCounts();
  }, []);

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error(error);
        return;
      }

      setEvents(data || []);
    }

    loadEvents();
  }, []);

  function getValidImage(url: string | null | undefined) {
    if (!url || typeof url !== "string") {
      return "/images/temp-event-image.png";
    }
    if (!url.startsWith("http")) {
      return "/images/temp-event-image.png";
    }
    return url;
  }

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      if (imageRef.current) {
        imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <main>
      <Header />

      <section className="parallax-image-container">
        <img
          ref={imageRef}
          src="/images/parallax-image.jpg"
          alt=""
          className="parallax-image"
        />

        <div className="parallax-image-text">
          <h2>Welcome to NestOrg</h2>
          <p>Your central hub for organizations at Cavite State University</p>
        </div>
      </section>

      <section id="random-ahh-container">
        <div className="rac-boxes">
          <img className="icon" src="/images/event_icon.svg" alt="" />
          <div>
            <h3>{eventCount}</h3>
            <p>Events</p>
          </div>
        </div>

        <div className="rac-boxes">
          <img className="icon" src="/images/organization-icon.svg" alt="" />
          <div>
            <h3>{orgCount}</h3>
            <p>Organizations</p>
          </div>
        </div>

        <div className="rac-boxes">
          <img className="icon" src="/images/profile-icon.svg" alt="" />
          <div>
            <h3>{userCount}</h3>
            <p>Users</p>
          </div>
        </div>
      </section>

      <section id="home-events-section">
        <div id="uec-heading">
          <div>
            <h3>Events</h3>
            <p>Check out current events!</p>
          </div>

          <Link href="/events">View All Events</Link>
        </div>

        <EventsGrid events={events} />
      </section>

      <Footer />
    </main>
  );
}
