"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Structure used for both organizations and events
type Item = {
  id: string;
  slug: string;
  name: string;
  approved: boolean;
  type: "organization" | "event";
};

export default function AdminPage() {
  // Used for redirecting users
  const router = useRouter();

  // Controls loading state
  const [loading, setLoading] = useState(true);

  // Tracks if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Stores organization data
  const [organizations, setOrganizations] = useState<Item[]>([]);

  // Stores event data
  const [events, setEvents] = useState<Item[]>([]);

  // Runs once when page loads
  useEffect(() => {
    async function checkAdmin() {
      // Get current logged in user
      const { data: authData } = await supabase.auth.getUser();

      // Redirect to login if not logged in
      if (!authData.user) {
        router.push("/auth");
        return;
      }

      // Check if user has admin privileges
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("admin")
        .eq("id", authData.user.id)
        .single();

      // Redirect home if not admin
      if (error || !profile?.admin) {
        router.push("/");
        return;
      }

      // Allow access to admin page
      setIsAdmin(true);

      // Load organizations and events
      fetchData();
    }

    checkAdmin();
  }, []);

  // Loads all organizations and events
  async function fetchData() {
    setLoading(true);

    // Fetch organizations and events at the same time
    const [orgRes, eventRes] = await Promise.all([
      supabase.from("organizations").select("*"),

      supabase.from("events").select("*"),
    ]);

    // Save organizations into state
    if (orgRes.data) {
      setOrganizations(
        orgRes.data.map((o: any) => ({
          id: o.id,
          slug: o.slug,
          name: o.name,
          approved: o.approved,
          type: "organization",
        })),
      );
    }

    // Save events into state
    if (eventRes.data) {
      setEvents(
        eventRes.data.map((e: any) => ({
          id: e.id,
          slug: e.slug || e.id,
          name: e.title ?? e.name,
          approved: e.approved,
          type: "event",
        })),
      );
    }

    setLoading(false);
  }

  // Toggles approval state of an item
  async function toggleApprove(item: Item) {
    // Decide which table to update
    const table = item.type === "organization" ? "organizations" : "events";

    // Flip approval status
    await supabase
      .from(table)
      .update({
        approved: !item.approved,
      })
      .eq("id", item.id);

    // Refresh page data
    fetchData();
  }

  // Deletes an organization or event
  async function deleteItem(item: Item) {
    // Decide which table to delete from
    const table = item.type === "organization" ? "organizations" : "events";

    // Delete item
    await supabase.from(table).delete().eq("id", item.id);

    // Refresh page data
    fetchData();
  }

  // Temporary loading screen while checking admin access
  if (!isAdmin) {
    return (
      <main>
        {/* Top navigation */}
        <Header />

        {/* Loading text */}
        <p>Checking admin access...</p>

        {/* Footer */}
        <Footer />
      </main>
    );
  }

  // Items waiting for approval
  const pending = [...organizations, ...events].filter(
    (item) => item.approved !== true,
  );

  // Items already approved
  const approved = [...organizations, ...events].filter(
    (item) => item.approved === true,
  );

  return (
    <main>
      {/* Top navigation */}
      <Header />

      {/* Main admin page */}
      <div className="admin-page">
        <h1 className="admin-title">Admin Dashboard</h1>

        {loading ? (
          // Loading message while fetching data
          <p className="admin-loading">Loading dashboard...</p>
        ) : (
          <>
            {/* Pending approval section */}
            <h2 className="admin-section-title">Pending Approval</h2>

            <div className="admin-list">
              {pending.length === 0 && (
                <div className="admin-empty">
                  No items waiting for approval.
                </div>
              )}

              {pending.map((item) => (
                <div key={`${item.type}-${item.id}`} className="admin-card">
                  {/* Item info */}
                  <div className="admin-card-title">
                    <span className="admin-tag">{item.type}</span>

                    {/* Link to organization or event page */}
                    <Link
                      href={
                        item.type === "organization"
                          ? `/orgs/${item.slug}`
                          : `/events/${item.slug}`
                      }
                      className="admin-link-title"
                    >
                      {item.name}
                    </Link>
                  </div>

                  {/* Admin action buttons */}
                  <div className="admin-actions">
                    <button
                      className="admin-btn admin-btn-approve"
                      onClick={() => toggleApprove(item)}
                    >
                      Approve
                    </button>

                    <button
                      className="admin-btn admin-btn-delete"
                      onClick={() => deleteItem(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Approved section */}
            <h2 className="admin-section-title">Approved</h2>

            <div className="admin-list">
              {approved.length === 0 && (
                <div className="admin-empty">No approved items yet.</div>
              )}

              {approved.map((item) => (
                <div key={`${item.type}-${item.id}`} className="admin-card">
                  {/* Item info */}
                  <div className="admin-card-title">
                    <span className="admin-tag">{item.type}</span>

                    {/* Link to organization or event page */}
                    <Link
                      href={
                        item.type === "organization"
                          ? `/orgs/${item.slug}`
                          : `/events/${item.slug}`
                      }
                      className="admin-link-title"
                    >
                      {item.name}
                    </Link>
                  </div>

                  {/* Admin action buttons */}
                  <div className="admin-actions">
                    <button
                      className="admin-btn admin-btn-unapprove"
                      onClick={() => toggleApprove(item)}
                    >
                      Unapprove
                    </button>

                    <button
                      className="admin-btn admin-btn-delete"
                      onClick={() => deleteItem(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
