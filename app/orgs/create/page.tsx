"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CreateOrganizationPage() {
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

  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [tags, setTags] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  function createSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

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

      const { error } = await supabase.from("organizations").insert([
        {
          name: orgName,

          slug,

          description,

          logo_url: logoUrl,

          banner_url: bannerUrl,

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

        setOrgName("");
        setDescription("");
        setLogoUrl("");
        setBannerUrl("");
        setTags("");
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

          <input
            type="text"
            placeholder="Organization Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />

          <textarea
            placeholder="Organization Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Logo Image URL"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />

          <input
            type="text"
            placeholder="Banner Image URL"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
          />

          <input
            type="text"
            placeholder="Tags (coding, gaming, arts)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Organization"}
          </button>
        </form>
      </section>

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
