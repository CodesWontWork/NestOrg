"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventCreatePage() {

  // =========================
  // SLUG GENERATOR (FIX ADDED)
  // =========================
  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // remove special characters
      .replace(/\s+/g, "-")        // spaces → dash
      .replace(/-+/g, "-");        // collapse multiple dashes
  }

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
  // USER ORGANIZATION
  // =========================
  const [userOrg, setUserOrg] = useState<any>(null);

  useEffect(() => {

    async function fetchUserOrg() {

      if (!user) return;

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        

      if (!error) {
        setUserOrg(data);
      }

    }

    fetchUserOrg();

  }, [user]);

  // =========================
  // FORM STATE
  // =========================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [tags, setTags] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================
  // CREATE EVENT
  // =========================
  async function handleCreateEvent(e: React.FormEvent) {

    e.preventDefault();

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    if (!userOrg) {
      setMessage("No organization assigned to your account.");
      return;
    }

    setLoading(true);
    setMessage("");

    // convert comma tags into array
    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    // =========================
    // FIX: CREATE SLUG HERE
    // =========================
    const slug = generateSlug(title);

    const { error } = await supabase
      .from("events")
      .insert({

        title,
        description,
        image_url: imageUrl,
        event_date: eventDate,
        tags: tagArray,

        slug, // ✅ IMPORTANT FIX

        org_id: userOrg.id,
        org_name: userOrg.name,
        created_by: user.id,

        approved: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Event submitted for approval!");

      setTitle("");
      setDescription("");
      setImageUrl("");
      setEventDate("");
      setTags("");
    }

    setLoading(false);
  }

  return (
    <main>

      <Header />

      {/* FORM */}
      <section className="event-create-section">

        <form className="event-create-form" onSubmit={handleCreateEvent}>

          <h1>Create Event</h1>

          {userOrg && (
            <p className="event-org-display">
              Posting as: {userOrg.name}
            </p>
          )}

          <input
            type="text"
            placeholder="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="Event Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />

          <input
            type="text"
            placeholder="Tags (example: seminar, technology, workshop)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          <button disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </button>

          {message && (
            <p className="event-create-message">
              {message}
            </p>
          )}

        </form>

      </section>

     <Footer />

    </main>
  );
}