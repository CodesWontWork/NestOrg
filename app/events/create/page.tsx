"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventCreatePage() {

  // =========================
  // SLUG GENERATOR
  // =========================
  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // =========================
  // TODAY DATE (FOR VALIDATION)
  // =========================
  const today = new Date().toISOString().split("T")[0];

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

  // =========================
  // USER ORGANIZATION
  // =========================
  const [userOrg, setUserOrg] = useState<any>(null);
  const [checkingOrg, setCheckingOrg] = useState(true);

  useEffect(() => {

    async function fetchUserOrg() {

      if (!user) {
        setCheckingOrg(false);
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id);

      console.log("ORG QUERY:", data, error);

      if (error) {
        console.error(error);
        setCheckingOrg(false);
        return;
      }

      // TAKE FIRST ORG
      if (data && data.length > 0) {
        setUserOrg(data[0]);
      } else {
        setUserOrg(null);
      }

      setCheckingOrg(false);
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

    // =========================
    // DATE VALIDATION
    // =========================
    if (!eventDate) {
      setMessage("Please select an event date.");
      return;
    }

    // compare selected date with today
    if (eventDate < today) {
      setMessage("You cannot create an event with a past date.");
      return;
    }

    setLoading(true);
    setMessage("");

    // convert comma tags into array
    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    // create slug
    const slug = generateSlug(title);

    // =========================
    // INSERT EVENT
    // =========================
    const { error } = await supabase
      .from("events")
      .insert({

        title,
        description,
        image_url: imageUrl,
        event_date: eventDate,
        tags: tagArray,

        slug,

        org_id: userOrg.id,
        org_name: userOrg.name,

        created_by: user.id,

        approved: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error(error);
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

      {/* =========================
          FORM
      ========================= */}
      <section className="event-create-section">

        <form
          className="event-create-form"
          onSubmit={handleCreateEvent}
        >

          <h1>Create Event</h1>

          {/* =========================
              ORG STATUS
          ========================= */}
          {checkingOrg ? (

            <p className="event-org-display">
              Checking organization...
            </p>

          ) : userOrg ? (

            <p className="event-org-display">
              Posting as: {userOrg.name}
            </p>

          ) : (

            <p className="event-org-display">
              No organization assigned to your account.
            </p>

          )}

          {/* TITLE */}
          <input
            type="text"
            placeholder="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* DESCRIPTION */}
          <textarea
            placeholder="Event Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* IMAGE */}
          <input
            type="text"
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          {/* DATE */}
          <input
            type="date"
            value={eventDate}
            min={today} // ✅ prevents selecting past dates
            onChange={(e) => setEventDate(e.target.value)}
            required
          />

          {/* TAGS */}
          <input
            type="text"
            placeholder="Tags (example: seminar, technology, workshop)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          {/* SUBMIT */}
          <button disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </button>

          {/* MESSAGE */}
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