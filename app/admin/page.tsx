"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Item = {
  id: string;
  slug: string;
  name: string;
  approved: boolean;
  type: "organization" | "event";
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizations, setOrganizations] = useState<Item[]>([]);
  const [events, setEvents] = useState<Item[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("admin")
        .eq("id", authData.user.id)
        .single();

      if (error || !profile?.admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      fetchData();
    };

    checkAdmin();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [orgRes, eventRes] = await Promise.all([
      supabase.from("organizations").select("*"),
      supabase.from("events").select("*"),
    ]);

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
  };

  const toggleApprove = async (item: Item) => {
    const table = item.type === "organization" ? "organizations" : "events";

    await supabase
      .from(table)
      .update({ approved: !item.approved })
      .eq("id", item.id);

    fetchData();
  };

  const deleteItem = async (item: Item) => {
    const table = item.type === "organization" ? "organizations" : "events";

    await supabase.from(table).delete().eq("id", item.id);

    fetchData();
  };

  if (!isAdmin) {
    return (
      <main>
        <Header />
        <p>Checking admin access...</p>
        <Footer />
      </main>
    );
  }

  const pending = [...organizations, ...events].filter(
    (i) => i.approved !== true,
  );

  const approved = [...organizations, ...events].filter(
    (i) => i.approved === true,
  );

  return (
    <main>
      <Header />

      <div className="admin-page">
        <h1 className="admin-title">Admin Dashboard</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <h2 className="admin-section-title">Pending Approval</h2>

            <div className="admin-list">
              {pending.map((item) => (
                <div key={`${item.type}-${item.id}`} className="admin-card">
                  <div className="admin-card-title">
                    <span className="admin-tag">{item.type}</span>

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

            <h2 className="admin-section-title">Approved</h2>

            <div className="admin-list">
              {approved.map((item) => (
                <div key={`${item.type}-${item.id}`} className="admin-card">
                  <div className="admin-card-title">
                    <span className="admin-tag">{item.type}</span>

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

      <Footer />
    </main>
  );
}
