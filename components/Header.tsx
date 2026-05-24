"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, username, admin")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setIsAdmin(data?.admin ?? false);
    }

    loadProfile();
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");

    if (saved === "dark") {
      document.documentElement.classList.add("darkmode");
      setDarkMode(true);
    }
  }, []);

  function toggleDarkMode() {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.remove("darkmode");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      root.classList.add("darkmode");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  // =========================
  // ACTIVE LINK
  // =========================
  function isActive(path: string) {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(path);
  }

  return (
    <header>
      <div className="header-main-box">
        <div className="header-left-box">
          <img src="/images/nest_org.svg" alt="logo" />

          <div className="header-left-text">
            <h1>NestOrg</h1>
            <p>CvSU Organizations and Events Hub</p>
          </div>
        </div>

        <div className="header-right-box">
          <Link
            className={`header-link ${isActive("/") ? "active-header-link" : ""}`}
            href="/"
          >
            Home
          </Link>

          <Link
            className={`header-link ${
              isActive("/orgs") ? "active-header-link" : ""
            }`}
            href="/orgs"
          >
            Organizations
          </Link>

          <Link
            className={`header-link ${
              isActive("/events") ? "active-header-link" : ""
            }`}
            href="/events"
          >
            Events
          </Link>

          <Link
            className={`header-link ${
              isActive("/about") ? "active-header-link" : ""
            }`}
            href="/about"
          >
            About
          </Link>

          {isAdmin && (
            <Link
              className={`admin-link ${
                isActive("/admin") ? "active-header-link" : ""
              }`}
              href="/admin"
            >
              Admin
            </Link>
          )}

          <img
            src={darkMode ? "/images/moon-icon.png" : "/images/sun-icon.png"}
            className="darkmode-btn"
            onClick={toggleDarkMode}
            alt="theme"
          />

          <div className="auth-section">
            {!user && (
              <Link href="/auth" className="login-link">
                Login
              </Link>
            )}

            {user && (
              <div className="user-box">
                <button onClick={logout} className="logout-btn">
                  Logout
                </button>

                <Link
                  href={`/profile/${
                    profile?.username ?? user.email?.split("@")[0]
                  }`}
                >
                  <img
                    src={
                      profile?.avatar_url?.trim()
                        ? profile.avatar_url
                        : "/images/user-icon.png"
                    }
                    className="profile-pic"
                    alt="profile"
                  />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
