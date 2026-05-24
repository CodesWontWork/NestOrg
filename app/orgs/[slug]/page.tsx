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
  // Get URL params
  const params = useParams();

  // Get organization slug from URL
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  // Store organization data
  const [org, setOrg] = useState<any>(null);

  // Store organization events
  const [events, setEvents] = useState<any[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user owns org
  const [isOwner, setIsOwner] = useState(false);

  // Edit modal toggle
  const [editing, setEditing] = useState(false);

  // Editable organization name
  const [editName, setEditName] = useState("");

  // Editable organization description
  const [editDescription, setEditDescription] = useState("");

  // Editable organization tags
  const [editTags, setEditTags] = useState("");

  // Editable logo URL
  const [logoUrl, setLogoUrl] = useState("");

  // Editable banner URL
  const [bannerUrl, setBannerUrl] = useState("");

  // Logo upload loading state
  const [logoUploading, setLogoUploading] = useState(false);

  // Banner upload loading state
  const [bannerUploading, setBannerUploading] = useState(false);

  // Check if user is admin
  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("admin")
      .eq("id", userId)
      .single();

    return data?.admin === true;
  }

  // Load organization data
  useEffect(() => {
    async function fetchOrg() {
      setLoading(true);

      // Get current logged in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let admin = false;

      // Check admin permissions
      if (user) {
        admin = await checkAdmin(user.id);

        setIsAdmin(admin);
      }

      // Fetch organization info
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .single();

      // Stop if org not found
      if (orgError || !orgData) {
        console.error(orgError);

        setLoading(false);

        return;
      }

      // Check if current user owns org
      if (
        user &&
        (orgData.owner_id === user.id || orgData.created_by === user.id)
      ) {
        setIsOwner(true);
      }

      // Store organization data
      setOrg(orgData);

      // Set default edit values
      setEditName(orgData.name || "");

      setEditDescription(orgData.description || "");

      setEditTags(Array.isArray(orgData.tags) ? orgData.tags.join(", ") : "");

      setLogoUrl(orgData.logo_url || "");

      setBannerUrl(orgData.banner_url || "");

      // Create events query
      let query = supabase
        .from("events")
        .select("*")
        .eq("org_id", orgData.id)
        .order("created_at", { ascending: false });

      // Hide unapproved events for non-admins
      if (!admin) {
        query = query.eq("approved", true);
      }

      // Fetch organization events
      const { data: eventData, error: eventError } = await query;

      // Show query error
      if (eventError) {
        console.error(eventError);
      } else {
        // Add hype and creator info
        const enriched = await enrichEvents(eventData || []);

        setEvents(enriched);
      }

      setLoading(false);
    }

    // Only fetch if slug exists
    if (slug) {
      fetchOrg();
    }
  }, [slug]);

  // Compress uploaded images
  async function compressImage(file: File) {
    const options = {
      maxSizeMB: 0.7,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };

    return await imageCompression(file, options);
  }

  // Upload image to Supabase storage
  async function uploadImage(file: File, bucket: string, folder: string) {
    // Allowed image types
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    // Reject unsupported files
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WEBP are allowed.");

      return null;
    }

    // Reject oversized images
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");

      return null;
    }

    // Compress image before upload
    const compressedFile = await compressImage(file);

    // Final compressed size limit
    if (compressedFile.size > 2 * 1024 * 1024) {
      alert("Compressed image is still too large. Please use a smaller image.");

      return null;
    }

    // Generate random file name
    const fileExt = "jpg";

    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    // Upload image to storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedFile, {
        cacheControl: "31536000",
        upsert: false,
      });

    // Show upload error
    if (error) {
      console.error(error);

      return null;
    }

    // Get public image URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return data.publicUrl;
  }

  // Handle logo upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setLogoUploading(true);

    // Compress image before preview
    const compressed = await compressImage(file);

    // Show preview image
    setLogoUrl(URL.createObjectURL(compressed));

    // Upload image to storage
    const url = await uploadImage(compressed, "organizations", "logos");

    // Store uploaded image URL
    if (url) {
      setLogoUrl(url);
    }

    setLogoUploading(false);
  }

  // Handle banner upload
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setBannerUploading(true);

    // Compress image before preview
    const compressed = await compressImage(file);

    // Show preview image
    setBannerUrl(URL.createObjectURL(compressed));

    // Upload image to storage
    const url = await uploadImage(compressed, "banners", "org-banners");

    // Store uploaded image URL
    if (url) {
      setBannerUrl(url);
    }

    setBannerUploading(false);
  }

  // Save edited organization
  async function saveOrg() {
    if (!org) return;

    // Update organization in database
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

    // Show database error
    if (error) {
      console.error(error);

      alert(error.message);

      return;
    }

    // Update local organization state
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

    // Close edit modal
    setEditing(false);
  }

  // Loading screen
  if (loading) {
    return <p className="org-loading">Loading organization...</p>;
  }

  // Organization not found
  if (!org) {
    return <p className="org-loading">Organization not found.</p>;
  }

  return (
    <main>
      <Header />

      {/* Hero: banner + org identity card overlapping it */}
      <div className="org-hero">
        {/* Banner image */}
        <div className="org-hero-banner">
          <img
            src={
              bannerUrl?.startsWith("http")
                ? bannerUrl
                : "/images/default-banner.jpg"
            }
            alt="banner"
            className="org-banner"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = "/images/default-banner.jpg";
            }}
          />
          <div className="org-banner-overlay"></div>
        </div>

        {/* Identity card: logo, name, tags, description, actions */}
        <div className="org-identity-card">
          {/* Left: logo */}
          <div className="org-identity-left">
            <img
              src={
                logoUrl?.startsWith("http")
                  ? logoUrl
                  : "/images/temp-org-image.png"
              }
              alt={org.name}
              className="org-page-logo"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = "/images/temp-org-image.png";
              }}
            />
          </div>

          {/* Right: info */}
          <div className="org-identity-body">
            <div className="org-identity-top">
              <div className="org-identity-name-tags">
                <h1 className="org-page-title">{org.name}</h1>

                {/* Tags inline with name */}
                <div className="org-page-tags">
                  {(Array.isArray(org.tags)
                    ? org.tags
                    : JSON.parse(org.tags || "[]")
                  ).map((tag: string, i: number) => (
                    <span key={i}>#{tag}</span>
                  ))}
                </div>
              </div>

              {/* Actions: edit button + admin badge */}
              <div className="org-identity-actions">
                {(isAdmin || isOwner) && (
                  <button
                    className="edit-profile-btn"
                    onClick={() => setEditing(true)}
                  >
                    Edit Organization
                  </button>
                )}
                {isAdmin && (
                  <span className="org-admin-badge">👁 Admin view</span>
                )}
              </div>
            </div>

            {/* Description */}
            {org.description && (
              <p className="org-page-description">{org.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Organization events */}
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

      {/* Edit organization modal */}
      {editing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h2>Edit Organization</h2>
              <button
                className="edit-modal-close"
                onClick={() => setEditing(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Name */}
            <div className="edit-modal-field">
              <label>Organization Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Organization Name"
              />
            </div>

            {/* Description */}
            <div className="edit-modal-field">
              <label>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Tell people what your organization is about..."
              />
            </div>

            {/* Tags */}
            <div className="edit-modal-field">
              <label>Tags</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="e.g. music, culture, sports (comma-separated)"
              />
            </div>

            {/* Image uploads side by side */}
            <div className="edit-modal-uploads">
              <div className="edit-modal-upload-block">
                <label>Logo</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleLogoUpload}
                />
                <p className="upload-note">Max 5MB · JPG, PNG, WEBP</p>
                {logoUploading && (
                  <p className="upload-status">Uploading logo…</p>
                )}
                {logoUrl?.startsWith("http") && !logoUploading && (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="edit-modal-preview edit-modal-preview--logo"
                  />
                )}
              </div>

              <div className="edit-modal-upload-block">
                <label>Banner</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleBannerUpload}
                />
                <p className="upload-note">Max 5MB · JPG, PNG, WEBP</p>
                {bannerUploading && (
                  <p className="upload-status">Uploading banner…</p>
                )}
                {bannerUrl?.startsWith("http") && !bannerUploading && (
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="edit-modal-preview edit-modal-preview--banner"
                  />
                )}
              </div>
            </div>

            {/* Modal buttons */}
            <div className="edit-modal-buttons">
              <button className="edit-modal-save" onClick={saveOrg}>
                Save Changes
              </button>
              <button
                className="edit-modal-cancel"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
