"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventPage() {
  // Get slug from the URL
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  // Store logged in session
  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;

  // Check auth session on page load
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

  // Main event data
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hype system states
  const [hypeCount, setHypeCount] = useState(0);
  const [hasHyped, setHasHyped] = useState(false);

  // Permission states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Edit modal toggle
  const [editing, setEditing] = useState(false);

  // Edit form states
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTags, setEditTags] = useState("");

  // Image states
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  // Check if user is admin
  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("admin")
      .eq("id", userId)
      .single();
    return data?.admin === true;
  }

  // Load event data
  useEffect(() => {
    async function fetchEvent() {
      if (!slug) return;
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let admin = false;
      if (user) {
        admin = await checkAdmin(user.id);
        setIsAdmin(admin);
      }

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

      if (user && (data.created_by === user.id || data.owner_id === user.id)) {
        setIsOwner(true);
      }

      setEvent(data);
      setEditTitle(data.title || "");
      setEditDescription(data.description || "");
      setEditDate(data.event_date || "");
      setEditTags(Array.isArray(data.tags) ? data.tags.join(", ") : "");
      setImageUrl(data.image_url || "");

      const { count } = await supabase
        .from("event_hype")
        .select("*", { count: "exact", head: true })
        .eq("event_id", data.id);

      setHypeCount(count || 0);

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
  }, [slug]);

  // Scroll reveal observer
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(".reveal, .reveal-left, .reveal-right")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  // Image compression & upload
  const MAX_FILE_SIZE_MB = 2;

  async function compressIfNeeded(file: File) {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
    }
    return file;
  }

  async function uploadImage(file: File) {
    const compressedFile = await compressIfNeeded(file);
    const fileExt = compressedFile.name.split(".").pop();
    const fileName = `events/${Date.now()}-${Math.random()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("events")
      .upload(fileName, compressedFile);

    if (error) {
      console.error(error);
      return null;
    }

    const { data } = supabase.storage.from("events").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB before compression)");
      return;
    }

    setImageUploading(true);
    const url = await uploadImage(file);
    if (url) setImageUrl(url);
    setImageUploading(false);
  }

  // Save edited event
  async function saveEvent() {
    if (!event) return;

    const { error } = await supabase
      .from("events")
      .update({
        title: editTitle,
        description: editDescription,
        event_date: editDate,
        image_url: imageUrl,
        tags: editTags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== ""),
      })
      .eq("id", event.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEvent({
      ...event,
      title: editTitle,
      description: editDescription,
      event_date: editDate,
      image_url: imageUrl,
      tags: editTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
    });

    setEditing(false);
  }

  // Toggle hype
  async function toggleHype() {
    if (!user || !event) return;

    if (hasHyped) {
      await supabase
        .from("event_hype")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", user.id);
      setHasHyped(false);
      setHypeCount((prev) => prev - 1);
    } else {
      const { error } = await supabase.from("event_hype").insert({
        event_id: event.id,
        user_id: user.id,
      });
      if (!error) {
        setHasHyped(true);
        setHypeCount((prev) => prev + 1);
      }
    }
  }

  // Safely parse tags
  let parsedTags: string[] = [];
  try {
    parsedTags = Array.isArray(event?.tags)
      ? event.tags
      : JSON.parse(event?.tags || "[]");
  } catch {
    parsedTags = [];
  }

  function getImage(url: string) {
    if (!url || !url.startsWith("http")) return "/images/temp-event-image.png";
    return url;
  }

  // Format date nicely
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Loading screen
  if (loading) {
    return (
      <main>
        <Header />
        <div className="event-loading">
          <p>Loading event...</p>
        </div>
        <Footer />
      </main>
    );
  }

  // Event not found
  if (!event) {
    return (
      <main>
        <Header />
        <div className="event-loading">
          <p>Event not found.</p>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />

      {/* Hero banner with image and title overlay */}
      <div className="event-hero">
        <img
          src={getImage(imageUrl)}
          alt={event.title}
          className="event-hero-image"
        />
        <div className="event-hero-overlay" />
        <div className="event-hero-text">
          <h1 className="event-hero-title">{event.title}</h1>
          {event.event_date && (
            <p className="event-hero-date">{formatDate(event.event_date)}</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <section className="event-page-section">
        <div className="event-page-container reveal">
          {/* Left: description + tags */}
          <div className="event-body">
            <p className="event-description">{event.description}</p>

            {parsedTags.length > 0 && (
              <div className="event-tags" style={{ marginTop: "20px" }}>
                {parsedTags.map((t, i) => (
                  <span key={i}>#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Right: info sidebar */}
          <aside className="event-sidebar">
            {/* Hype card */}
            <div className="event-sidebar-card">
              <p className="event-hype-count">🔥 {hypeCount} hype</p>
              <button
                className={`event-hype-btn ${hasHyped ? "hyped" : ""}`}
                onClick={toggleHype}
                disabled={!user}
                title={!user ? "Log in to hype this event" : ""}
              >
                {hasHyped ? "✓ Hyped!" : "Add Hype"}
              </button>
              {!user && (
                <p className="event-sidebar-note">Log in to add hype</p>
              )}
            </div>

            {/* Date card */}
            {event.event_date && (
              <div className="event-sidebar-card">
                <p className="event-sidebar-label">Date</p>
                <p className="event-sidebar-value">
                  {formatDate(event.event_date)}
                </p>
              </div>
            )}

            {/* Edit button for admin or owner */}
            {(isAdmin || isOwner) && (
              <button
                className="event-edit-btn"
                onClick={() => setEditing(true)}
              >
                Edit Event
              </button>
            )}
          </aside>
        </div>
      </section>

      {/* Edit modal */}
      {editing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2>Edit Event</h2>

            <label>Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Event title"
            />

            <label>Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Event description"
            />

            <label>Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            <label>Event Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {imageUploading && <p>Uploading image...</p>}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="event-upload-preview"
              />
            )}

            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="e.g. sports, academic, arts"
            />

            <div className="edit-modal-buttons">
              <button onClick={saveEvent}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
