"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";

export default function ProfilePage() {

  // =========================
  // AUTH STATE
  // =========================
  const [session, setSession] = useState<any>(null);
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // LOGOUT
  // =========================
  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  // =========================
  // PROFILE STATE
  // =========================
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // EDIT MODAL
  // =========================
  const [editing, setEditing] = useState(false);

  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editBanner, setEditBanner] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  // =========================
  // EVENTS
  // =========================
  const [events, setEvents] = useState<any[]>([]);

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", user.id);

      if (profileData) {
        setProfile(profileData);

        setEditUsername(profileData.username || "");
        setEditBio(profileData.bio || "");
        setEditBanner(profileData.banner_url || "");
        setEditAvatar(profileData.avatar_url || "");
      }

      setEvents(eventsData || []);
      setLoading(false);
    }

    loadProfile();
  }, [user]);

  // =========================
  // SAVE PROFILE
  // =========================
  async function saveProfile() {
    if (!user) return;

    const updates = {
      username: editUsername,
      bio: editBio,
      banner_url: editBanner,
      avatar_url: editAvatar,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("Save profile error:", error);
      alert(error.message);
      return;
    }

    setProfile((prev: any) => ({
      ...prev,
      ...updates,
    }));

    setEditing(false);
  }

  // =========================
  // NOT LOGGED IN
  // =========================
  if (!user) {
    return (
      <main className="profile-not-logged-in">
        <h1>Please Login First</h1>
        <Link href="/auth">Go To Login</Link>
      </main>
    );
  }

  return (
    <main>

      <Header />

      {/* =========================================================
          PROFILE SECTION
      ========================================================= */}
      <section className="profile-page">

        {/* BANNER */}
        <div className="profile-banner">

          <img
            src={
              profile?.banner_url ||
              "/images/default-banner.jpg"
            }
            alt="banner"
          />

        </div>

        {/* PROFILE CARD */}
        <div className="profile-card">

          {/* PROFILE PIC */}
          <img
            src={
              profile?.avatar_url ||
              "/images/user-icon.png"
            }
            alt="profile"
            className="profile-main-pic"
          />

          {/* USERNAME */}
          <h1>
            {profile?.username || "Unnamed User"}
          </h1>

          {/* BIO */}
          <p className="profile-bio">
            {profile?.bio || "No bio yet."}
          </p>

          {/* EDIT BUTTON */}
          <button
            className="edit-profile-btn"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </button>

        </div>

      </section>

      {/* =========================================================
          STATS
      ========================================================= */}
      <section className="profile-stats">

        {/* EVENTS MADE */}
        <div className="profile-stat-box">

          <h2>{events.length}</h2>

          <p>Events Made</p>

        </div>

        {/* ORG MEMBERSHIP */}
        <div className="profile-stat-box">

          <h2>
            {profile?.org_memberships?.length || 0}
          </h2>

          <p>Organization Memberships</p>

        </div>

      </section>

      {/* =========================================================
          ORG MEMBERSHIPS
      ========================================================= */}
      <section className="profile-section">

        <h2>Organization Memberships</h2>

        <div className="profile-grid">

          {(profile?.org_memberships || []).map(
            (org: string, i: number) => (

              <div className="profile-chip" key={i}>
                {org}
              </div>

            )
          )}

        </div>

      </section>

      {/* =========================================================
          EVENTS CREATED
      ========================================================= */}
      <section className="profile-section">

        <h2>Events Created</h2>

        <EventsGrid events={events} />

      </section>

      {/* =========================================================
          EDIT MODAL
      ========================================================= */}
      {editing && (

        <div className="edit-modal-overlay">

          <div className="edit-modal">

            <h2>Edit Profile</h2>

            {/* USERNAME */}
            <input
              type="text"
              placeholder="Username"
              value={editUsername}
              onChange={(e) =>
                setEditUsername(e.target.value)
              }
            />

            {/* BIO */}
            <textarea
              placeholder="Bio"
              value={editBio}
              onChange={(e) =>
                setEditBio(e.target.value)
              }
            />

            {/* PROFILE PIC */}
            <input
              type="text"
              placeholder="Profile Picture URL"
              value={editAvatar}
              onChange={(e) =>
                setEditAvatar(e.target.value)
              }
            />

            {/* BANNER */}
            <input
              type="text"
              placeholder="Banner URL"
              value={editBanner}
              onChange={(e) =>
                setEditBanner(e.target.value)
              }
            />

            {/* BUTTONS */}
            <div className="edit-modal-buttons">

              <button onClick={saveProfile}>
                Save
              </button>

              <button
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}

      <Footer />

    </main>
  );
}