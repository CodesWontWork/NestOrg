"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CreateOrganizationPage() {
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
  // FORM STATE
  // =========================
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // =========================
  // IMAGE FILES
  // =========================
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  // =========================
  // STATUS
  // =========================
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // =========================
  // SLUG
  // =========================
  function createSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  // =========================
  // COMPRESS IMAGE
  // =========================
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const image = new Image();

      image.src = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement("canvas");

        // =========================
        // MAX SIZE
        // =========================
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        let width = image.width;
        let height = image.height;

        // =========================
        // RESIZE
        // =========================
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

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);

        // =========================
        // COMPRESS QUALITY
        // =========================
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
  // UPLOAD IMAGE
  // =========================
  async function uploadImage(file: File, bucket: string, folder: string) {
    // =========================
    // TYPE CHECK
    // =========================
    if (!file.type.startsWith("image/")) {
      setMessageType("error");
      setMessage("Only image files are allowed.");

      return null;
    }

    // =========================
    // ORIGINAL SIZE LIMIT
    // =========================
    if (file.size > 10 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Image must be below 10MB.");

      return null;
    }

    // =========================
    // COMPRESS IMAGE
    // =========================
    const compressedFile = await compressImage(file);

    // =========================
    // FINAL SIZE LIMIT
    // =========================
    if (compressedFile.size > 2 * 1024 * 1024) {
      setMessageType("error");
      setMessage(
        "Compressed image is still too large. Please use a smaller image.",
      );

      return null;
    }

    const fileExt = "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `${folder}/${fileName}`;

    // =========================
    // UPLOAD
    // =========================
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setMessageType("error");
      setMessage(error.message);

      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return data.publicUrl;
  }

  // =========================
  // CREATE ORG
  // =========================
  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      setMessageType("error");

      setMessage("You must be logged in to create an organization.");

      return;
    }

    setLoading(true);

    try {
      const slug = createSlug(orgName);

      // =========================
      // CHECK DUPLICATE
      // =========================
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existingOrg) {
        setMessageType("error");

        setMessage("An organization with this name already exists.");

        setLoading(false);

        return;
      }

      // =========================
      // LOGO UPLOAD
      // =========================
      let uploadedLogoUrl = "";

      if (logoFile) {
        const url = await uploadImage(logoFile, "organizations", "logos");

        if (!url) {
          setLoading(false);
          return;
        }

        uploadedLogoUrl = url;
      }

      // =========================
      // BANNER UPLOAD
      // =========================
      let uploadedBannerUrl = "";

      if (bannerFile) {
        const url = await uploadImage(bannerFile, "banners", "org-banners");

        if (!url) {
          setLoading(false);
          return;
        }

        uploadedBannerUrl = url;
      }

      // =========================
      // INSERT ORG
      // =========================
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

      if (error) {
        setMessageType("error");

        setMessage(error.message);
      } else {
        setMessageType("success");

        setMessage(
          "Organization submitted successfully! Waiting for admin approval.",
        );

        // RESET
        setOrgName("");
        setDescription("");
        setTags("");

        setLogoFile(null);
        setBannerFile(null);

        setLogoPreview("");
        setBannerPreview("");
      }
    } catch (err) {
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

          {/* NAME */}
          <input
            type="text"
            placeholder="Organization Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />

          {/* DESCRIPTION */}
          <textarea
            placeholder="Organization Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* LOGO */}
          <div className="org-upload-box">
            <label>Organization Logo</label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                // =========================
                // LIMIT TYPES
                // =========================
                const allowed = ["image/png", "image/jpeg", "image/webp"];

                if (!allowed.includes(file.type)) {
                  setMessageType("error");
                  setMessage("Only PNG, JPG, and WEBP images are allowed.");

                  return;
                }

                // =========================
                // LIMIT SIZE
                // =========================
                if (file.size > 10 * 1024 * 1024) {
                  setMessageType("error");
                  setMessage("Image must be below 10MB.");

                  return;
                }

                setLogoFile(file);

                setLogoPreview(URL.createObjectURL(file));
              }}
            />

            {logoPreview && (
              <img
                src={logoPreview}
                alt="logo preview"
                className="org-upload-preview logo-preview"
              />
            )}
          </div>

          {/* BANNER */}
          <div className="org-upload-box">
            <label>Organization Banner</label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                const allowed = ["image/png", "image/jpeg", "image/webp"];

                if (!allowed.includes(file.type)) {
                  setMessageType("error");
                  setMessage("Only PNG, JPG, and WEBP images are allowed.");

                  return;
                }

                if (file.size > 10 * 1024 * 1024) {
                  setMessageType("error");
                  setMessage("Image must be below 10MB.");

                  return;
                }

                setBannerFile(file);

                setBannerPreview(URL.createObjectURL(file));
              }}
            />

            {bannerPreview && (
              <img
                src={bannerPreview}
                alt="banner preview"
                className="org-upload-preview banner-preview"
              />
            )}
          </div>

          {/* TAGS */}
          <input
            type="text"
            placeholder="Tags (coding, gaming, arts)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          {/* SUBMIT */}
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Organization"}
          </button>
        </form>
      </section>

      {/* MESSAGE */}
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
