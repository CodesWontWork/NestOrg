"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventsGrid from "@/components/EventsGrid";
import { enrichEvents } from "@/components/enrichEvents";

export default function OrganizationPage() {
  const params = useParams();
  const slug = params.slug;

  const [org, setOrg] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("admin")
      .eq("id", userId)
      .single();

    return data?.admin === true;
  };

  useEffect(() => {
    async function fetchOrg() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      let admin = false;

      if (user) {
        admin = await checkAdmin(user.id);
        setIsAdmin(admin);
      }

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

      setOrg(orgData);

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

  if (loading) {
    return <p className="org-loading">Loading organization...</p>;
  }

  if (!org) {
    return <p className="org-loading">Organization not found.</p>;
  }

  return (
    <main>
      <Header />

      <section className="org-banner-section">
        <img
          src={org.banner_url || "/images/default-banner.jpg"}
          alt="banner"
          className="org-banner"
        />
        <div className="org-banner-overlay"></div>
      </section>

      <section className="org-main-section">
        <img
          src={
            org.logo_url?.startsWith("http")
              ? org.logo_url
              : "/images/temp-org-image.png"
          }
          alt={org.name}
          className="org-page-logo"
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

        {isAdmin && (
          <p style={{ color: "green", fontSize: "12px" }}>
            Admin view: showing unapproved events
          </p>
        )}
      </section>

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

      <Footer />
    </main>
  );
}
