"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

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

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  // =========================
  // EVENT STATE
  // =========================
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [tags, setTags] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);

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
        error = fallback.error;
      }

      if (error || !data) {
        setMessage("Event not found.");
        setLoading(false);
        return;
      }

      setEvent(data);

      setTitle(data.title || "");
      setDescription(data.description || "");
      setImageUrl(data.image_url || "");
      setEventDate(data.event_date || "");

      setTags(
        Array.isArray(data.tags)
          ? data.tags.join(", ")
          : JSON.parse(data.tags || "[]").join(", ")
      );

      setLoading(false);
    }

    fetchEvent();
  }, [slug]);

  // =========================
  // OWNER CHECK
  // =========================
  const isOwner = !!user && !!event && user.id === event.created_by;

  // =========================
  // UPDATE EVENT
  // =========================
  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const generatedSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    await supabase
      .from("events")
      .update({
        title,
        description,
        image_url: imageUrl,
        event_date: eventDate,
        tags: tagArray,
        slug: generatedSlug,
      })
      .eq("id", event.id);

    setEvent({
      ...event,
      title,
      description,
      image_url: imageUrl,
      event_date: eventDate,
      tags: tagArray,
      slug: generatedSlug,
    });

    setMessage("Event updated successfully!");
    setIsEditOpen(false);

    if (generatedSlug !== slug) {
      router.push(`/events/${generatedSlug}`);
    }
  }

  // =========================
  // DELETE
  // =========================
  async function handleDeleteEvent() {
    if (!isOwner) return;

    const confirmed = confirm("Delete this event permanently?");
    if (!confirmed) return;

    await supabase.from("events").delete().eq("id", event.id);

    router.push("/events");
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
    if (!url || !url.startsWith("http"))
      return "/images/temp-event-image.png";
    return url;
  }

  if (loading) return <p>Loading...</p>;
  if (!event) return <p>Event not found</p>;

  return (
    <main>
      <Header />

      {/* =========================
          EVENT HERO SECTION
      ========================= */}
      <section className="event-page-section">
        <div className="event-page-container">

          <img
            src={getImage(imageUrl || event.image_url)}
            className="event-page-image"
            alt={event.title}
          />

          <div className="event-content">

            <h1 className="event-title">{event.title}</h1>

            {/* DATE */}
            {event.event_date && (
              <p className="event-date">
                📅{" "}
                {new Date(event.event_date).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}

            <p className="event-description">
              {event.description}
            </p>

            {/* TAGS */}
            <div className="event-tags">
              {parsedTags.map((t, i) => (
                <span key={i}>#{t}</span>
              ))}
            </div>

            {/* ACTIONS */}
            {isOwner && (
              <div className="event-actions">
                <button
                  className="event-save-btn"
                  onClick={() => setIsEditOpen(true)}
                >
                  Edit Event
                </button>

                <button
                  className="event-delete-btn"
                  onClick={handleDeleteEvent}
                >
                  Delete Event
                </button>
              </div>
            )}

            {message && <p>{message}</p>}
          </div>
        </div>
      </section>

      {/* =========================
          EDIT MODAL
      ========================= */}
      {isEditOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit Event</h2>

            <form onSubmit={handleUpdateEvent}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
              />

              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL"
              />

              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags"
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}