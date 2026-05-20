"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function OrgsPage() {

  // =========================
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      setOrgs(data || []);
      setLoading(false);
    }

    fetchOrgs();
  }, []);


  const [search, setSearch] = useState("");

  // filter logic (name OR tags)
  const filteredOrgs = orgs.filter((org) => {

    const nameMatch =
      org.name?.toLowerCase().includes(search.toLowerCase());

    const tagsMatch =
      Array.isArray(org.tags)
        ? org.tags.join(" ").toLowerCase().includes(search.toLowerCase())
        : (org.tags || "")
            .toLowerCase()
            .includes(search.toLowerCase());

    return nameMatch || tagsMatch;
  });



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

        {filteredOrgs.map((org) => (

          <Link
            key={org.id}
            href={`/orgs/${org.slug}`}
            className="org-card-link"
          >

            <div className="org-card">

              <img
                src={org.logo_url || "/images/temp-org-image.png"}
                alt={org.name}
                className="org-logo"
              />

              <h3>{org.name}</h3>

              <p>{org.description}</p>

              <div className="org-tags">

                {(Array.isArray(org.tags)
                  ? org.tags
                  : JSON.parse(org.tags || "[]")
                ).map((tag: string, i: number) => (

                  <span key={i}>
                    #{tag}
                  </span>

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