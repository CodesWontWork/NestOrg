"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventCreatePage() {
  // Create a clean URL slug from event title
  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Get today's date for date validation
  const today = new Date().toISOString().split("T")[0];

  // Store current logged in session
  const [session, setSession] = useState<Session | null>(null);

  // Store logged in user
  const user = session?.user ?? null;

  // Listen for login/logout changes
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

  // Store organization linked to user
  const [userOrg, setUserOrg] = useState<any>(null);

  // Loading state while checking organization
  const [checkingOrg, setCheckingOrg] = useState(true);

  // Fetch user's organization
  useEffect(() => {
    async function fetchUserOrg() {
      if (!user) {
        setCheckingOrg(false);
        return;
      }

      // Get organizations owned by user
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id);

      if (error) {
        console.error(error);

        setCheckingOrg(false);

        return;
      }

      // Store first organization found
      if (data && data.length > 0) {
        setUserOrg(data[0]);
      } else {
        setUserOrg(null);
      }

      setCheckingOrg(false);
    }

    fetchUserOrg();
  }, [user]);

  // Store event title
  const [title, setTitle] = useState("");

  // Store event description
  const [description, setDescription] = useState("");

  // Store selected event date
  const [eventDate, setEventDate] = useState("");

  // Store event tags
  const [tags, setTags] = useState("");

  // Store uploaded image file
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Store image preview URL
  const [imagePreview, setImagePreview] = useState("");

  // Loading state while submitting form
  const [loading, setLoading] = useState(false);

  // Store success/error messages
  const [message, setMessage] = useState("");

  // Compress uploaded image before upload
  async function compressImage(file: File) {
    return new Promise<File>((resolve) => {
      const image = new Image();

      image.src = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement("canvas");

        // Maximum image width
        const MAX_WIDTH = 1280;

        // Calculate resize ratio
        const scaleSize = MAX_WIDTH / image.width;

        // Resize width if too large
        canvas.width = image.width > MAX_WIDTH ? MAX_WIDTH : image.width;

        // Resize height while keeping ratio
        canvas.height =
          image.width > MAX_WIDTH ? image.height * scaleSize : image.height;

        const ctx = canvas.getContext("2d");

        // Draw image on canvas
        ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Convert canvas into compressed JPG
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

  // Handle event creation
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();

    // Check if user is logged in
    if (!user) {
      setMessage("You must be logged in.");

      return;
    }

    // Check if user has an organization
    if (!userOrg) {
      setMessage("No organization assigned to your account.");

      return;
    }

    // Check if date is selected
    if (!eventDate) {
      setMessage("Please select an event date.");

      return;
    }

    // Prevent past dates
    if (eventDate < today) {
      setMessage("You cannot create an event with a past date.");

      return;
    }

    setLoading(true);

    setMessage("");

    // Convert tags string into array
    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    // Generate event slug
    const slug = generateSlug(title);

    // Store uploaded image URL
    let uploadedImageUrl = "";

    // Upload image if selected
    if (imageFile) {
      // Allowed image formats
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      // Validate file type
      if (!allowedTypes.includes(imageFile.type)) {
        setMessage("Only JPG, PNG, and WEBP images are allowed.");

        setLoading(false);

        return;
      }

      // Validate file size
      if (imageFile.size > 5 * 1024 * 1024) {
        setMessage("Image must be under 5MB.");

        setLoading(false);

        return;
      }

      // Compress image before upload
      const compressedImage = await compressImage(imageFile);

      // Generate unique file name
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.jpg`;

      // Full upload path
      const filePath = `event-images/${fileName}`;

      // Upload image to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("events")
        .upload(filePath, compressedImage, {
          cacheControl: "31536000",
          upsert: false,
        });

      // Handle upload error
      if (uploadError) {
        console.error(uploadError);

        setMessage(uploadError.message);

        setLoading(false);

        return;
      }

      // Get public image URL
      const { data } = supabase.storage.from("events").getPublicUrl(filePath);

      uploadedImageUrl = data.publicUrl;
    }

    // Insert event into database
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

    // Handle database errors
    if (error) {
      console.error(error);

      setMessage(error.message);
    } else {
      setMessage("Event submitted for approval!");

      // Reset form after success
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

      {/* Event creation form */}
      <section className="event-create-section">
        <form className="event-create-form" onSubmit={handleCreateEvent}>
          <h1>Create Event</h1>

          {/* Show organization status */}
          {checkingOrg ? (
            <p className="event-org-display">Checking organization...</p>
          ) : userOrg ? (
            <p className="event-org-display">Posting as: {userOrg.name}</p>
          ) : (
            <p className="event-org-display">
              No organization assigned to your account.
            </p>
          )}

          {/* Event title input */}
          <input
            type="text"
            placeholder="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Event description input */}
          <textarea
            placeholder="Event Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Event image upload */}
          <div className="event-upload-box">
            <label>Event Image</label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                // Limit image size
                if (file.size > 5 * 1024 * 1024) {
                  setMessage("Image must be under 5MB.");

                  return;
                }

                // Save selected file
                setImageFile(file);

                // Create preview image
                setImagePreview(URL.createObjectURL(file));
              }}
            />

            <p className="upload-note">Max size: 5MB • JPG, PNG, WEBP only</p>

            {/* Show image preview */}
            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                className="event-upload-preview"
              />
            )}
          </div>

          {/* Event date input */}
          <input
            type="date"
            value={eventDate}
            min={today}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />

          {/* Event tags input */}
          <input
            type="text"
            placeholder="Tags (example: seminar, technology, workshop)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          {/* Submit button */}
          <button disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </button>

          {/* Success or error message */}
          {message && <p className="event-create-message">{message}</p>}
        </form>
      </section>

      <Footer />
    </main>
  );
}
