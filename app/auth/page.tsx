"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AuthPage() {
  const [session, setSession] = useState<Session | null>(null);
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);

    setPopup({
      show: true,
      type: "success",
      text: "Logged out successfully!",
    });
  }

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    text: "",
  });

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const { data: existingUsers, error: usernameError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username);

    if (usernameError) {
      setPopup({
        show: true,
        type: "error",
        text: "Error checking username.",
      });

      setLoading(false);
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      setPopup({
        show: true,
        type: "error",
        text: "Username already exists.",
      });

      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          display_name: username,
          username: username,
        },
      },
    });

    if (error) {
      setPopup({
        show: true,
        type: "error",
        text: error.message,
      });

      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username: username,
        email: email,
      });
    }

    setPopup({
      show: true,
      type: "success",
      text: "Account created! Check your email to confirm.",
    });

    setUsername("");
    setEmail("");
    setPassword("");

    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setPopup({
        show: true,
        type: "error",
        text: error.message,
      });
    } else {
      setPopup({
        show: true,
        type: "success",
        text: "Login successful!",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }

    setLoading(false);
  }

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      if (imageRef.current) {
        imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
      }
    }

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  {
  }
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, username")
        .eq("id", user.id)
        .single();

      setProfile(data);
    }

    loadProfile();
  }, [user]);

  return (
    <main>
      <Header />

      <div className="auth-page">
        <div className="auth-bg">
          <img ref={imageRef} src="/images/home-image2.jpg" alt="background" />
        </div>

        <div className="auth-container">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="auth-form">
              <h1>Log In</h1>

              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />

              <button className="submit" disabled={loading}>
                {loading ? "Loading..." : "Log In"}
              </button>

              <div>
                <p>Need an account?</p>

                <p onClick={() => setMode("signup")} className="switch">
                  Sign Up
                </p>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="auth-form">
              <h1>Sign Up</h1>

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />

                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="terms-btn"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms & Conditions
                  </button>
                </span>
              </label>

              <button className="submit" disabled={loading || !acceptedTerms}>
                {loading ? "Loading..." : "Sign Up"}
              </button>

              <div>
                <p>Already have an account?</p>

                <p onClick={() => setMode("login")} className="switch">
                  Log In
                </p>
              </div>
            </form>
          )}

          {showTerms && (
            <div className="popup-overlay">
              <div className="popup-box">
                <button
                  className="popup-close"
                  onClick={() => setShowTerms(false)}
                >
                  ✕
                </button>

                <h2>Terms & Conditions</h2>

                <div className="popup-content">
                  <p>By creating an account on NestOrg, you agree to:</p>

                  <ul>
                    <li>Use the platform respectfully.</li>
                    <li>Not impersonate other users or organizations.</li>
                    <li>Not upload harmful or illegal content.</li>
                    <li>Keep your account credentials secure.</li>
                    <li>
                      Follow Cavite State University community guidelines.
                    </li>
                  </ul>

                  <p>
                    NestOrg reserves the right to suspend accounts that violate
                    these rules.
                  </p>
                </div>

                <button
                  className="popup-accept"
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTerms(false);
                  }}
                >
                  I Understand
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          POPUP MESSAGE
      ===================================================== */}
      {popup.show && (
        <div className="auth-message">
          <div className="auth-message-box">
            {/* CLOSE BUTTON */}
            <button
              className="close-popup"
              onClick={() =>
                setPopup({
                  ...popup,
                  show: false,
                })
              }
            >
              ✕
            </button>

            {/* POPUP TEXT */}
            <p>{popup.text}</p>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
