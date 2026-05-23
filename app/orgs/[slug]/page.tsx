"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import imageCompression from "browser-image-compression";

import { supabase } from "@/lib/supabase";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";
import { enrichEvents } from "@/components/enrichEvents";

export default function OrganizationPage() {
  // =========================
  // PARAMS
  // =========================
  const params = useParams();

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  // =========================
  // STATES
  // =========================
  const [org, setOrg] = useState<any>(null);

  const [events, setEvents] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);

  const [isOwner, setIsOwner] = useState(false);

  const [editing, setEditing] = useState(false);

  // =========================
  // EDIT STATES
  // =========================
  const [editName, setEditName] = useState("");

  const [editDescription, setEditDescription] = useState("");

  const [editTags, setEditTags] = useState("");

  const [logoUrl, setLogoUrl] = useState("");

  const [bannerUrl, setBannerUrl] = useState("");

  const [logoUploading, setLogoUploading] = useState(false);

  const [bannerUploading, setBannerUploading] = useState(false);

  // =========================
  // ADMIN CHECK
  // =========================
  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("admin")
      .eq("id", userId)
      .single();

    return data?.admin === true;
  }

  // =========================
  // FETCH ORG
  // =========================
  useEffect(() => {
    async function fetchOrg() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let admin = false;

      if (user) {
        admin = await checkAdmin(user.id);

        setIsAdmin(admin);
      }

      // =========================
      // GET ORG
      // =========================
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .single();

      if (orgError || !orgData) {
        console.error(orgError);

        setLoading(false);

        return;
      }

      // =========================
      // OWNER CHECK
      // =========================
      if (
        user &&
        (orgData.owner_id === user.id || orgData.created_by === user.id)
      ) {
        setIsOwner(true);
      }

      // =========================
      // SET ORG
      // =========================
      setOrg(orgData);

      // =========================
      // DEFAULT EDIT VALUES
      // =========================
      setEditName(orgData.name || "");

      setEditDescription(orgData.description || "");

      setEditTags(Array.isArray(orgData.tags) ? orgData.tags.join(", ") : "");

      setLogoUrl(orgData.logo_url || "");

      setBannerUrl(orgData.banner_url || "");

      // =========================
      // EVENTS
      // =========================
      let query = supabase
        .from("events")
        .select("*")
        .eq("org_id", orgData.id)
        .order("created_at", { ascending: false });

      if (!admin) {
        query = query.eq("approved", true);
      }

      const { data: eventData, error: eventError } = await query;

      if (eventError) {
        console.error(eventError);
      } else {
        const enriched = await enrichEvents(eventData || []);

        setEvents(enriched);
      }

      setLoading(false);
    }

    if (slug) {
      fetchOrg();
    }
  }, [slug]);

  // =========================
  // IMAGE COMPRESSION
  // =========================
  async function compressImage(file: File) {
    const options = {
      maxSizeMB: 0.7,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };

    return await imageCompression(file, options);
  }

  // =========================
  // IMAGE UPLOAD
  // =========================
  async function uploadImage(file: File, bucket: string, folder: string) {
    // =========================
    // FILE TYPE LIMIT
    // =========================
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WEBP are allowed.");

      return null;
    }

    // =========================
    // FILE SIZE LIMIT
    // =========================
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");

      return null;
    }

    // =========================
    // COMPRESS
    // =========================
    const compressedFile = await compressImage(file);

    const fileExt = "jpg";

    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    // =========================
    // UPLOAD
    // =========================
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedFile, {
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      console.error(error);

      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return data.publicUrl;
  }

  // =========================
  // LOGO UPLOAD
  // =========================
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setLogoUploading(true);

    // =========================
    // COMPRESS FIRST
    // =========================
    const compressed = await compressImage(file);

    // =========================
    // PREVIEW COMPRESSED
    // =========================
    setLogoUrl(URL.createObjectURL(compressed));

    // =========================
    // UPLOAD
    // =========================
    const url = await uploadImage(compressed, "organizations", "logos");

    if (url) {
      setLogoUrl(url);
    }

    setLogoUploading(false);
  }

  // =========================
  // BANNER UPLOAD
  // =========================
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setBannerUploading(true);

    // =========================
    // COMPRESS FIRST
    // =========================
    const compressed = await compressImage(file);

    // =========================
    // PREVIEW COMPRESSED
    // =========================
    setBannerUrl(URL.createObjectURL(compressed));

    // =========================
    // UPLOAD
    // =========================
    const url = await uploadImage(compressed, "banners", "org-banners");

    if (url) {
      setBannerUrl(url);
    }

    setBannerUploading(false);
  }

  // =========================
  // SAVE EDITS
  // =========================
  async function saveOrg() {
    if (!org) return;

    const { error } = await supabase
      .from("organizations")
      .update({
        name: editName,

        description: editDescription,

        logo_url: logoUrl,

        banner_url: bannerUrl,

        tags: editTags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== ""),
      })
      .eq("id", org.id);

    if (error) {
      console.error(error);

      alert(error.message);

      return;
    }

    setOrg({
      ...org,

      name: editName,

      description: editDescription,

      logo_url: logoUrl,

      banner_url: bannerUrl,

      tags: editTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
    });

    setEditing(false);
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return <p className="org-loading">Loading organization...</p>;
  }

  // =========================
  // NOT FOUND
  // =========================
  if (!org) {
    return <p className="org-loading">Organization not found.</p>;
  }

  return (
    <main>
      <Header />

      {/* BANNER */}
      <section className="org-banner-section">
        <img
          src={
            bannerUrl?.startsWith("http")
              ? bannerUrl
              : "/images/default-banner.jpg"
          }
          alt="banner"
          className="org-banner"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/images/default-banner.jpg";
          }}
        />

        <div className="org-banner-overlay"></div>
      </section>

      {/* MAIN */}
      <section className="org-main-section">
        <img
          src={
            logoUrl?.startsWith("http") ? logoUrl : "/images/temp-org-image.png"
          }
          alt={org.name}
          className="org-page-logo"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/images/temp-org-image.png";
          }}
        />

        <h1 className="org-page-title">{org.name}</h1>

        <div className="org-page-tags">
          {(Array.isArray(org.tags)
            ? org.tags
            : JSON.parse(org.tags || "[]")
          ).map((tag: string, i: number) => (
            <span key={i}>#{tag}</span>
          ))}
        </div>

        <p className="org-page-description">{org.description}</p>

        {/* EDIT BUTTON */}
        {(isAdmin || isOwner) && (
          <button className="edit-profile-btn" onClick={() => setEditing(true)}>
            Edit Organization
          </button>
        )}

        {isAdmin && (
          <p
            style={{
              color: "green",
              fontSize: "12px",
            }}
          >
            Admin view: showing unapproved events
          </p>
        )}
      </section>

      {/* EVENTS */}
      <section className="org-events-section">
        <div className="org-events-header">
          <div>
            <h3>Events</h3>

            <p>Events from {org.name}</p>
          </div>

          <Link href="/events" className="org-events-viewall">
            View All Events
          </Link>
        </div>

        <EventsGrid events={events} />
      </section>

      {/* EDIT MODAL */}
      {editing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2>Edit Organization</h2>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Organization Name"
            />

            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
            />

            {/* LOGO */}
            <label>Logo Upload</label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleLogoUpload}
            />

            <p className="upload-note">Max size: 5MB • JPG, PNG, WEBP only</p>

            {logoUploading && <p>Uploading logo...</p>}

            {/* BANNER */}
            <label>Banner Upload</label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleBannerUpload}
            />

            <p className="upload-note">Max size: 5MB • JPG, PNG, WEBP only</p>

            {bannerUploading && <p>Uploading banner...</p>}

            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="Tags"
            />

            <div className="edit-modal-buttons">
              <button onClick={saveOrg}>Save</button>

              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
