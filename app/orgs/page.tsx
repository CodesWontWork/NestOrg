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
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // =========================
  // FETCH ORGS (OPTIMIZED QUERY)
  // =========================
  useEffect(() => {
    async function fetchOrgs() {
      setLoading(true);
      setError("");

      // IMPORTANT: only fetch what you use
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, description, logo_url, tags");

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const formatted: Org[] = (data || []).map((org) => {
        let tags: string[] = [];

        try {
          if (Array.isArray(org.tags)) {
            tags = org.tags;
          } else if (typeof org.tags === "string") {
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

      setOrgs(formatted);
      setLoading(false);
    }

    fetchOrgs();
  }, []);

  // =========================
  // FILTER (MEMOIZED)
  // =========================
  const filteredOrgs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orgs;

    return orgs.filter((org) => {
      const nameMatch = org.name?.toLowerCase().includes(q);
      const tagsMatch = (org.tags || []).join(" ").toLowerCase().includes(q);

      return nameMatch || tagsMatch;
    });
  }, [orgs, search]);

  // =========================
  // IMAGE SAFETY
  // =========================
  function getLogo(url?: string) {
    if (!url || typeof url !== "string") return "/images/temp-org-image.png";
    if (!url.startsWith("http")) return "/images/temp-org-image.png";
    return url;
  }

  // =========================
  // LOADING / ERROR
  // =========================
  if (loading) {
    return (
      <main>
        <Header />
        <p>Loading organizations...</p>
        <Footer />
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <Header />
        <p>Error: {error}</p>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />

      {/* SEARCH */}
      <section className="search-container">
        <input
          className="search-input"
          type="text"
          placeholder="Search organizations or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link href="/orgs/create" className="add-org-btn">
          + Add Organization
        </Link>
      </section>

      {/* GRID */}
      <div className="org-grid">
        {filteredOrgs.length === 0 && <p>No organizations found.</p>}

        {filteredOrgs.map((org) => (
          <Link
            key={org.id}
            href={`/orgs/${org.slug}`}
            className="org-card-link"
          >
            <div className="org-card">
              <img
                src={getLogo(org.logo_url)}
                alt={org.name}
                className="org-logo"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = "/images/temp-org-image.png";
                }}
              />

              <h3>{org.name}</h3>

              <p>{org.description}</p>

              <div className="org-tags">
                {(org.tags || []).slice(0, 5).map((tag, i) => (
                  <span key={i}>#{tag}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Footer />
    </main>
  );
}
