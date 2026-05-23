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
        const fileExt = logoFile.name.split(".").pop();

        const fileName = `${Date.now()}-logo.${fileExt}`;

        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("organizations")
          .upload(filePath, logoFile);

        if (uploadError) {
          setMessageType("error");
          setMessage(uploadError.message);

          setLoading(false);
          return;
        }

        const { data } = supabase.storage
          .from("organizations")
          .getPublicUrl(filePath);

        uploadedLogoUrl = data.publicUrl;
      }

      // =========================
      // BANNER UPLOAD
      // =========================
      let uploadedBannerUrl = "";

      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();

        const fileName = `${Date.now()}-banner.${fileExt}`;

        const filePath = `banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("organizations")
          .upload(filePath, bannerFile);

        if (uploadError) {
          setMessageType("error");
          setMessage(uploadError.message);

          setLoading(false);
          return;
        }

        const { data } = supabase.storage
          .from("organizations")
          .getPublicUrl(filePath);

        uploadedBannerUrl = data.publicUrl;
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
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

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
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

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
