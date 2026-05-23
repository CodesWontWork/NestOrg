"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";
import { enrichEvents } from "@/components/enrichEvents";

export default function ProfilePage() {
  // =========================
  // PARAMS
  // =========================
  const params = useParams();

  const username = decodeURIComponent(
    Array.isArray(params.username) ? params.username[0] : params.username || "",
  );

  // =========================
  // SESSION
  // =========================
  const [session, setSession] = useState<any>(null);

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

  const loggedInUser = session?.user;

  // =========================
  // STATE
  // =========================
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    async function loadProfile() {
      if (!username) return;

      setLoading(true);

      console.log("SEARCHING USERNAME:", username);

      // =========================
      // GET PROFILE
      // =========================
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", username)
        .single();

      console.log("PROFILE RESULT:", profileData, error);

      if (error || !profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // =========================
      // GET EVENTS
      // =========================
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", profileData.id)
        .order("created_at", { ascending: false });

      const enrichedEvents = await enrichEvents(eventData || []);

      setEvents(enrichedEvents);

      setLoading(false);
    }

    loadProfile();
  }, [username]);

  // =========================
  // OWNER CHECK
  // =========================
  const isOwner = loggedInUser && profile && loggedInUser.id === profile.id;

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <main>
        <Header />
        <p className="org-loading">Loading profile...</p>
        <Footer />
      </main>
    );
  }

  // =========================
  // NOT FOUND
  // =========================
  if (!profile) {
    return (
      <main>
        <Header />
        <p className="org-loading">Profile not found.</p>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />

      {/* =========================
          PROFILE HERO
      ========================= */}
      <section className="profile-page">
        <div className="profile-banner">
          <img
            src={profile.banner_url || "/images/default-banner.jpg"}
            alt="banner"
          />
        </div>

        <div className="profile-card">
          <img
            src={profile.avatar_url || "/images/user-icon.png"}
            alt="profile"
            className="profile-main-pic"
          />

          <h1>{profile.username || "Unnamed User"}</h1>

          <p className="profile-bio">{profile.bio || "No bio yet."}</p>

          {isOwner && (
            <button className="edit-profile-btn">Edit Profile</button>
          )}
        </div>
      </section>

      {/* =========================
          STATS
      ========================= */}
      <section className="profile-stats">
        <div className="profile-stat-box">
          <h2>{events.length}</h2>
          <p>Events Made</p>
        </div>
      </section>

      {/* =========================
          EVENTS
      ========================= */}
      <section className="profile-section">
        <h2>Events Created</h2>

        <EventsGrid events={events} />
      </section>

      <Footer />
    </main>
  );
}
