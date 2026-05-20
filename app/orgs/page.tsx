"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function OrgsPage() {

  // =========================
  // STATE
  // =========================
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // =========================
  // FETCH ORGS
  // =========================
  useEffect(() => {

    async function fetchOrgs() {

      setLoading(true);

      const { data, error } = await supabase
        .from("organizations")
        .select("*");

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // normalize tags
      const formattedData = (data || []).map((org) => {

        let parsedTags: string[] = [];

        try {

          if (Array.isArray(org.tags)) {
            parsedTags = org.tags;
          }

          else if (typeof org.tags === "string") {

            // try JSON parse first
            parsedTags = JSON.parse(org.tags);

            // if not array after parsing
            if (!Array.isArray(parsedTags)) {
              parsedTags = [org.tags];
            }
          }

        } catch {

          // fallback if invalid JSON
          parsedTags = org.tags
            ? [org.tags]
            : [];
        }

        return {
          ...org,
          tags: parsedTags,
        };
      });

      setOrgs(formattedData);
      setLoading(false);
    }

    fetchOrgs();

  }, []);

  // =========================
  // FILTER
  // =========================
  const filteredOrgs = orgs.filter((org) => {

    const searchText = search.toLowerCase();

    const nameMatch =
      org.name?.toLowerCase().includes(searchText);

    const tagsMatch =
      org.tags
        ?.join(" ")
        .toLowerCase()
        .includes(searchText);

    return nameMatch || tagsMatch;
  });

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return <p>Loading organizations...</p>;
  }

  // =========================
  // ERROR
  // =========================
  if (error) {
    return <p>Error: {error}</p>;
  }

  // =========================
  // PAGE
  // =========================
  return (

    <main>

      <Header />

      <section className="search-container">

        <input
          className="search-input"
          type="text"
          placeholder="Search organizations or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link
          href="/orgs/create"
          className="add-org-btn"
        >
          + Add Organization
        </Link>

      </section>

      <div className="org-grid">

        {filteredOrgs.length === 0 && (
          <p>No organizations found.</p>
        )}

        {filteredOrgs.map((org) => (

          <Link
            key={org.id}
            href={`/orgs/${org.slug}`}
            className="org-card-link"
          >

            <div className="org-card">

              <img
                src={
                  org.logo_url ||
                  "/images/temp-org-image.png"
                }
                alt={org.name}
                className="org-logo"
              />

              <h3>{org.name}</h3>

              <p>{org.description}</p>

              <div className="org-tags">

                {org.tags.map(
                  (tag: string, i: number) => (

                    <span key={i}>
                      #{tag}
                    </span>

                  )
                )}

              </div>

            </div>

          </Link>

        ))}

      </div>

      <Footer />

    </main>
  );
}