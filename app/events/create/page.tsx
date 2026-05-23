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
  // IMAGE
  // =========================
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState("");

  // =========================
  // STATUS
  // =========================
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  // =========================
  // COMPRESS IMAGE
  // =========================
  async function compressImage(file: File) {
    return new Promise<File>((resolve) => {
      const image = new Image();

      image.src = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement("canvas");

        const MAX_WIDTH = 1280;

        const scaleSize = MAX_WIDTH / image.width;

        canvas.width = image.width > MAX_WIDTH ? MAX_WIDTH : image.width;

        canvas.height =
          image.width > MAX_WIDTH ? image.height * scaleSize : image.height;

        const ctx = canvas.getContext("2d");

        ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);

              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.\w+$/, ".jpg"),
              {
                type: "image/jpeg",
              },
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          0.7,
        );
      };
    });
  }

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
      // =========================
      // FILE LIMITS
      // =========================
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(imageFile.type)) {
        setMessage("Only JPG, PNG, and WEBP images are allowed.");

        setLoading(false);

        return;
      }

      // 5MB LIMIT
      if (imageFile.size > 5 * 1024 * 1024) {
        setMessage("Image must be under 5MB.");

        setLoading(false);

        return;
      }

      // =========================
      // COMPRESS IMAGE
      // =========================
      const compressedImage = await compressImage(imageFile);

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.jpg`;

      const filePath = `event-images/${fileName}`;

      // =========================
      // UPLOAD
      // =========================
      const { error: uploadError } = await supabase.storage
        .from("events")
        .upload(filePath, compressedImage, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);

        setMessage(uploadError.message);

        setLoading(false);

        return;
      }

      // =========================
      // GET URL
      // =========================
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

      // RESET
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

          {/* IMAGE */}
          <div className="event-upload-box">
            <label>Event Image</label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                // =========================
                // FILE LIMIT
                // =========================
                if (file.size > 5 * 1024 * 1024) {
                  setMessage("Image must be under 5MB.");

                  return;
                }

                setImageFile(file);

                setImagePreview(URL.createObjectURL(file));
              }}
            />

            <p className="upload-note">Max size: 5MB • JPG, PNG, WEBP only</p>

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
