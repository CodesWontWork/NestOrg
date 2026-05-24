"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Org = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  tags?: string[];
};

export default function OrgsPage() {
  // Stores all organizations
  const [orgs, setOrgs] = useState<Org[]>([]);

  // Controls loading state
  const [loading, setLoading] = useState(true);

  // Stores possible errors
  const [error, setError] = useState("");

  // Stores search input
  const [search, setSearch] = useState("");

  // Loads organizations on page load
  useEffect(() => {
    async function fetchOrgs() {
      setLoading(true);

      setError("");

      // Fetch only needed columns
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, description, logo_url, tags");

      // Handle fetch errors
      if (error) {
        setError(error.message);

        setLoading(false);

        return;
      }

      // Clean and format organization data
      const formatted: Org[] = (data || []).map((org) => {
        let tags: string[] = [];

        try {
          // Handle array tags
          if (Array.isArray(org.tags)) {
            tags = org.tags;
          }

          // Handle JSON string tags
          else if (typeof org.tags === "string") {
            const parsed = JSON.parse(org.tags);

            tags = Array.isArray(parsed) ? parsed : [];
          }
        } catch {
          tags = [];
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logo_url: org.logo_url,
          tags,
        };
      });

      // Save organizations into state
      setOrgs(formatted);

      setLoading(false);
    }

    fetchOrgs();
  }, []);

  // Filters organizations based on search
  const filteredOrgs = useMemo(() => {
    const q = search.toLowerCase().trim();

    // Return all orgs if search is empty
    if (!q) return orgs;

    return orgs.filter((org) => {
      // Match organization name
      const nameMatch = org.name?.toLowerCase().includes(q);

      // Match tags
      const tagsMatch = (org.tags || []).join(" ").toLowerCase().includes(q);

      return nameMatch || tagsMatch;
    });
  }, [orgs, search]);

  // Returns fallback image if logo is invalid
  function getLogo(url?: string) {
    if (!url || typeof url !== "string") {
      return "/images/temp-org-image.png";
    }

    if (!url.startsWith("http")) {
      return "/images/temp-org-image.png";
    }

    return url;
  }

  // Loading screen
  if (loading) {
    return (
      <main>
        <Header />
        <p className="org-loading">Loading organizations…</p>
        <Footer />
      </main>
    );
  }

  // Error screen
  if (error) {
    return (
      <main>
        <Header />
        <p className="org-loading">Error: {error}</p>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />

      {/* Page header */}
      <div className="orgs-page-header">
        <div className="orgs-page-header-inner">
          <div className="orgs-page-title-group">
            <h1 className="orgs-page-title">Organizations</h1>
            <p className="orgs-page-subtitle">
              Discover groups hosting events near you
            </p>
          </div>

          <Link href="/orgs/create" className="add-org-btn">
            + Add Organization
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div className="orgs-search-bar">
        <div className="orgs-search-inner">
          <span className="orgs-search-icon">🔍</span>
          <input
            className="orgs-search-input"
            type="text"
            placeholder="Search by name or tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="orgs-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {search && (
          <p className="orgs-search-count">
            {filteredOrgs.length} result{filteredOrgs.length !== 1 ? "s" : ""}{" "}
            for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* Organization cards grid */}
      <div className="org-grid">
        {filteredOrgs.length === 0 && (
          <div className="orgs-empty">
            <p>No organizations found.</p>
          </div>
        )}

        {filteredOrgs.map((org) => (
          <Link
            key={org.id}
            href={`/orgs/${org.slug}`}
            className="org-card-link"
          >
            <div className="org-card">
              {/* Logo */}
              <div className="org-card-logo-wrap">
                <img
                  src={getLogo(org.logo_url)}
                  alt={org.name}
                  className="org-card-logo"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = "/images/temp-org-image.png";
                  }}
                />
              </div>

              {/* Body */}
              <div className="org-card-body">
                <h3 className="org-card-name">{org.name}</h3>

                {org.description && (
                  <p className="org-card-desc">{org.description}</p>
                )}

                {(org.tags || []).length > 0 && (
                  <div className="org-tags">
                    {(org.tags || []).slice(0, 4).map((tag, i) => (
                      <span key={i}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <span className="org-card-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>

      <Footer />
    </main>
  );
}
