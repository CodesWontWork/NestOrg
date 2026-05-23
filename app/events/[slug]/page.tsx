"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventPage() {
  // =========================
  // PARAMS
  // =========================
  const params = useParams();

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  // =========================
  // SESSION
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
  // STATES
  // =========================
  const [event, setEvent] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [hypeCount, setHypeCount] = useState(0);
  const [hasHyped, setHasHyped] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [editing, setEditing] = useState(false);

  // =========================
  // EDIT STATES
  // =========================
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTags, setEditTags] = useState("");

  const [imageUrl, setImageUrl] = useState("");

  const [imageUploading, setImageUploading] = useState(false);

  // =========================
  // ADMIN CHECK
  // =========================
  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("admin")
      .eq("id", userId)
      .single();

    return data?.admin === true;
  }

  // =========================
  // FETCH EVENT
  // =========================
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

  // =========================
  // IMAGE LIMIT SETTINGS
  // =========================
  const MAX_FILE_SIZE_MB = 2;

  async function compressIfNeeded(file: File) {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };

      return await imageCompression(file, options);
    }

    return file;
  }

  // =========================
  // IMAGE UPLOAD
  // =========================
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

  // =========================
  // HANDLE IMAGE
  // =========================
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    // HARD LIMIT (prevents abuse)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB before compression)");
      return;
    }

    setImageUploading(true);

    const url = await uploadImage(file);

    if (url) {
      setImageUrl(url);
    }

    setImageUploading(false);
  }

  // =========================
  // SAVE EVENT
  // =========================
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

  // =========================
  // HYPE
  // =========================
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

  // =========================
  // TAGS
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
  // IMAGE SAFE DISPLAY
  // =========================
  function getImage(url: string) {
    if (!url || !url.startsWith("http")) {
      return "/images/temp-event-image.png";
    }
    return url;
  }

  // =========================
  // LOADING
  // =========================
  if (loading) return <p>Loading...</p>;
  if (!event) return <p>Event not found</p>;

  return (
    <main>
      <Header />

      <section className="event-page-section">
        <div className="event-page-container">
          <img
            src={getImage(imageUrl)}
            className="event-page-image"
            alt={event.title}
          />

          <div className="event-content">
            <h1 className="event-title">{event.title}</h1>

            {event.event_date && (
              <p className="event-date">
                {new Date(event.event_date).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}

            <div className="event-hype-section">
              <p className="event-hype-count">{hypeCount} hype</p>

              <button
                className={`event-hype-btn ${hasHyped ? "hyped" : ""}`}
                onClick={toggleHype}
                disabled={!user}
              >
                {hasHyped ? "Hyped" : "Add Hype"}
              </button>
            </div>

            <p className="event-description">{event.description}</p>

            <div className="event-tags">
              {parsedTags.map((t, i) => (
                <span key={i}>#{t}</span>
              ))}
            </div>

            {(isAdmin || isOwner) && (
              <button
                className="edit-profile-btn"
                onClick={() => setEditing(true)}
              >
                Edit Event
              </button>
            )}
          </div>
        </div>
      </section>

      {editing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2>Edit Event</h2>

            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            <label>Event Image</label>

            <input type="file" accept="image/*" onChange={handleImageUpload} />

            {imageUploading && <p>Uploading image...</p>}

            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
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
