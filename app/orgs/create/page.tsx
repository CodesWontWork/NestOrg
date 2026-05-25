"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CreateOrganizationPage() {
  // Store the current user session
  const [session, setSession] = useState<Session | null>(null);

  // Get logged in user
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

  // Form input states
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // Store uploaded image files
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Store image preview URLs
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  // Loading state while submitting
  const [loading, setLoading] = useState(false);

  // Message popup text
  const [message, setMessage] = useState("");

  // Message type styling
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // Convert org name into URL slug
  function createSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  // Compress uploaded image before upload
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const image = new Image();

      image.src = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement("canvas");

        // Maximum image size
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;

        let width = image.width;
        let height = image.height;

        // Resize large images
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        // Fallback if canvas fails
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw resized image
        ctx.drawImage(image, 0, 0, width, height);

        // Convert image into compressed JPG
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

  // Upload image to Supabase storage
  async function uploadImage(file: File, bucket: string, folder: string) {
    // Check if uploaded file is an image
    if (!file.type.startsWith("image/")) {
      setMessageType("error");
      setMessage("Only image files are allowed.");

      return null;
    }

    // Limit original file size
    if (file.size > 20 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Image must be below 20MB.");

      return null;
    }

    // Compress image before upload
    const compressedFile = await compressImage(file);

    // Limit compressed file size
    if (compressedFile.size > 10 * 1024 * 1024) {
      setMessageType("error");
      setMessage(
        "Compressed image is still too large. Please use a smaller image.",
      );

      return null;
    }

    // Generate random image filename
    const fileExt = "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `${folder}/${fileName}`;

    // Upload image to Supabase bucket
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    // Show upload error
    if (error) {
      setMessageType("error");
      setMessage(error.message);

      return null;
    }

    // Get uploaded image URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return data.publicUrl;
  }

  // Handle organization creation
  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();

    // Prevent guests from creating orgs
    if (!user) {
      setMessageType("error");

      setMessage("You must be logged in to create an organization.");

      return;
    }

    setLoading(true);

    try {
      // Create URL slug
      const slug = createSlug(orgName);

      // Check for duplicate organization slug
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();

      // Stop duplicate org creation
      if (existingOrg) {
        setMessageType("error");

        setMessage("An organization with this name already exists.");

        setLoading(false);

        return;
      }

      // Store uploaded logo URL
      let uploadedLogoUrl = "";

      // Upload logo image
      if (logoFile) {
        const url = await uploadImage(logoFile, "organizations", "logos");

        if (!url) {
          setLoading(false);
          return;
        }

        uploadedLogoUrl = url;
      }

      // Store uploaded banner URL
      let uploadedBannerUrl = "";

      // Upload banner image
      if (bannerFile) {
        const url = await uploadImage(bannerFile, "banners", "org-banners");

        if (!url) {
          setLoading(false);
          return;
        }

        uploadedBannerUrl = url;
      }

      // Insert organization into database
      const { error } = await supabase.from("organizations").insert([
        {
          name: orgName,
          slug,
          description,
          logo_url: uploadedLogoUrl,
          banner_url: uploadedBannerUrl,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== ""),
          created_by: user.id,
          owner_id: user.id,
          approved: false,
          created_at: new Date().toISOString(),
        },
      ]);

      // Show database error
      if (error) {
        setMessageType("error");

        setMessage(error.message);
      } else {
        // Show success message
        setMessageType("success");

        setMessage(
          "Organization submitted successfully! Waiting for admin approval.",
        );

        // Reset all form inputs
        setOrgName("");
        setDescription("");
        setTags("");

        setLogoFile(null);
        setBannerFile(null);

        setLogoPreview("");
        setBannerPreview("");
      }
    } catch (err) {
      // Catch unexpected errors
      setMessageType("error");

      setMessage("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <main>
      <Header />

      <section className="create-org-page">
        <form onSubmit={handleCreateOrg} className="create-org-form">
          <h1>Create Organization</h1>

          <p className="create-org-subtitle">
            Submit your organization for approval.
          </p>

          {/* Organization name input */}
          <input
            type="text"
            placeholder="Organization Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />

          {/* Organization description input */}
          <textarea
            placeholder="Organization Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Logo upload section */}
          <div className="org-upload-box">
            <label>Organization Logo</label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                // Allowed image types
                const allowed = ["image/png", "image/jpeg", "image/webp"];

                // Reject unsupported file types
                if (!allowed.includes(file.type)) {
                  setMessageType("error");
                  setMessage("Only PNG, JPG, and WEBP images are allowed.");

                  return;
                }

                // Reject oversized images
                if (file.size > 10 * 1024 * 1024) {
                  setMessageType("error");
                  setMessage("Image must be below 10MB.");

                  return;
                }

                // Save selected logo file
                setLogoFile(file);

                // Generate logo preview
                setLogoPreview(URL.createObjectURL(file));
              }}
            />

            {/* Show logo preview */}
            {logoPreview && (
              <img
                src={logoPreview}
                alt="logo preview"
                className="org-upload-preview logo-preview"
              />
            )}
          </div>

          {/* Banner upload section */}
          <div className="org-upload-box">
            <label>Organization Banner</label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                // Allowed image types
                const allowed = ["image/png", "image/jpeg", "image/webp"];

                // Reject unsupported file types
                if (!allowed.includes(file.type)) {
                  setMessageType("error");
                  setMessage("Only PNG, JPG, and WEBP images are allowed.");

                  return;
                }

                // Reject oversized images
                if (file.size > 10 * 1024 * 1024) {
                  setMessageType("error");
                  setMessage("Image must be below 10MB.");

                  return;
                }

                // Save selected banner file
                setBannerFile(file);

                // Generate banner preview
                setBannerPreview(URL.createObjectURL(file));
              }}
            />

            {/* Show banner preview */}
            {bannerPreview && (
              <img
                src={bannerPreview}
                alt="banner preview"
                className="org-upload-preview banner-preview"
              />
            )}
          </div>

          {/* Tags input */}
          <input
            type="text"
            placeholder="Tags (coding, gaming, arts)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          {/* Submit button */}
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Organization"}
          </button>
        </form>
      </section>

      {/* Popup message */}
      {message && (
        <div className="auth-message">
          <div className="auth-message-box">
            <button
              className="auth-message-close"
              onClick={() => setMessage("")}
            >
              ✕
            </button>

            <p>{message}</p>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
