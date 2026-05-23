"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventCreatePage() {
  // =========================
  // SLUG
  // =========================
  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  const today = new Date().toISOString().split("T")[0];

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
  // USER ORG
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

      if (error) {
        console.error(error);
        setCheckingOrg(false);
        return;
      }

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

  const [eventDate, setEventDate] = useState("");
  const [tags, setTags] = useState("");

  // =========================
  // IMAGE UPLOAD
  // =========================
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState("");

  // =========================
  // STATUS
  // =========================
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

    if (!eventDate) {
      setMessage("Please select an event date.");
      return;
    }

    if (eventDate < today) {
      setMessage("You cannot create an event with a past date.");
      return;
    }

    setLoading(true);
    setMessage("");

    // =========================
    // TAGS
    // =========================
    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    const slug = generateSlug(title);

    // =========================
    // IMAGE UPLOAD
    // =========================
    let uploadedImageUrl = "";

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const filePath = `event-images/${fileName}`;

      // upload
      const { error: uploadError } = await supabase.storage
        .from("events")
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error(uploadError);
        setMessage(uploadError.message);
        setLoading(false);
        return;
      }

      // get public url
      const { data } = supabase.storage.from("events").getPublicUrl(filePath);

      uploadedImageUrl = data.publicUrl;
    }

    // =========================
    // INSERT EVENT
    // =========================
    const { error } = await supabase.from("events").insert({
      title,
      description,

      image_url: uploadedImageUrl,

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

      setEventDate("");
      setTags("");

      setImageFile(null);
      setImagePreview("");
    }

    setLoading(false);
  }

  return (
    <main>
      <Header />

      <section className="event-create-section">
        <form className="event-create-form" onSubmit={handleCreateEvent}>
          <h1>Create Event</h1>

          {checkingOrg ? (
            <p className="event-org-display">Checking organization...</p>
          ) : userOrg ? (
            <p className="event-org-display">Posting as: {userOrg.name}</p>
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

          {/* IMAGE UPLOAD */}
          <div className="event-upload-box">
            <label>Event Image</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                setImageFile(file);

                setImagePreview(URL.createObjectURL(file));
              }}
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                className="event-upload-preview"
              />
            )}
          </div>

          {/* DATE */}
          <input
            type="date"
            value={eventDate}
            min={today}
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

          {/* BUTTON */}
          <button disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </button>

          {message && <p className="event-create-message">{message}</p>}
        </form>
      </section>

      <Footer />
    </main>
  );
}
