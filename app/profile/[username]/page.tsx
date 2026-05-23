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
  // EDIT STATE
  // =========================
  const [editing, setEditing] = useState(false);

  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    async function loadProfile() {
      if (!username) return;

      setLoading(true);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", username)
        .single();

      if (error || !profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // =========================
      // DEFAULT EDIT VALUES
      // =========================
      setEditUsername(profileData.username || "");
      setEditBio(profileData.bio || "");

      setAvatarUrl(profileData.avatar_url || "");
      setBannerUrl(profileData.banner_url || "");

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
  const isOwner =
    loggedInUser && profile && String(loggedInUser.id) === String(profile.id);

  // =========================
  // IMAGE UPLOAD
  // =========================
  async function uploadImage(file: File, bucket: string, folder: string) {
    const fileExt = file.name.split(".").pop();

    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      console.error(error);

      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return data.publicUrl;
  }

  // =========================
  // AVATAR UPLOAD
  // =========================
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setAvatarUploading(true);

    const url = await uploadImage(file, "avatars", "profile-avatars");

    if (url) {
      setAvatarUrl(url);
    }

    setAvatarUploading(false);
  }

  // =========================
  // BANNER UPLOAD
  // =========================
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setBannerUploading(true);

    const url = await uploadImage(file, "banners", "profile-banners");

    if (url) {
      setBannerUrl(url);
    }

    setBannerUploading(false);
  }

  // =========================
  // SAVE PROFILE
  // =========================
  async function saveProfile() {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username: editUsername,
        bio: editBio,

        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);

      return;
    }

    setProfile({
      ...profile,

      username: editUsername,
      bio: editBio,

      avatar_url: avatarUrl,
      banner_url: bannerUrl,
    });

    setEditing(false);
  }

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
            src={
              bannerUrl?.startsWith("http")
                ? bannerUrl
                : "/images/default-banner.jpg"
            }
            alt="banner"
          />
        </div>

        <div className="profile-card">
          <img
            src={
              avatarUrl?.startsWith("http")
                ? avatarUrl
                : "/images/user-icon.png"
            }
            alt="profile"
            className="profile-main-pic"
            onError={(e) => {
              e.currentTarget.src = "/images/user-icon.png";
            }}
          />

          <h1>{profile.username || "Unnamed User"}</h1>

          <p className="profile-bio">{profile.bio || "No bio yet."}</p>

          {isOwner && (
            <button
              className="edit-profile-btn"
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </button>
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

      {/* =========================
          EDIT MODAL
      ========================= */}
      {editing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2>Edit Profile</h2>

            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="Username"
            />

            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Bio"
            />

            {/* AVATAR */}
            <label>Avatar Upload</label>

            <input type="file" accept="image/*" onChange={handleAvatarUpload} />

            {avatarUploading && <p>Uploading avatar...</p>}

            {/* BANNER */}
            <label>Banner Upload</label>

            <input type="file" accept="image/*" onChange={handleBannerUpload} />

            {bannerUploading && <p>Uploading banner...</p>}

            <div className="edit-modal-buttons">
              <button onClick={saveProfile}>Save</button>

              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
