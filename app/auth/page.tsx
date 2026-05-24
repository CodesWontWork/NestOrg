"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AuthPage() {
  // Store current auth session
  const [session, setSession] = useState<Session | null>(null);

  // Current logged in user
  const user = session?.user ?? null;

  // Check login session on page load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Remove listener on page unload
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Logout current user
  async function logout() {
    await supabase.auth.signOut();

    setSession(null);

    // Show success popup
    setPopup({
      show: true,
      type: "success",
      text: "Logged out successfully!",
    });
  }

  // Current auth mode
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Signup form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Popup message state
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    text: "",
  });

  // Handle user signup
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    // Check if username already exists
    const { data: existingUsers, error: usernameError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username);

    // Show error if username check fails
    if (usernameError) {
      setPopup({
        show: true,
        type: "error",
        text: "Error checking username.",
      });

      setLoading(false);

      return;
    }

    // Stop if username already exists
    if (existingUsers && existingUsers.length > 0) {
      setPopup({
        show: true,
        type: "error",
        text: "Username already exists.",
      });

      setLoading(false);

      return;
    }

    // Create Supabase auth account
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

    // Show signup error
    if (error) {
      setPopup({
        show: true,
        type: "error",
        text: error.message,
      });

      setLoading(false);

      return;
    }

    // Create profile row in database
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username: username,
        email: email,
      });
    }

    // Show success popup
    setPopup({
      show: true,
      type: "success",
      text: "Account created! Check your email to confirm.",
    });

    // Reset signup form
    setUsername("");
    setEmail("");
    setPassword("");

    setLoading(false);
  }

  // Handle user login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    // Login using email and password
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    // Show login error
    if (error) {
      setPopup({
        show: true,
        type: "error",
        text: error.message,
      });
    } else {
      // Show success popup
      setPopup({
        show: true,
        type: "success",
        text: "Login successful!",
      });

      // Redirect to homepage
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }

    setLoading(false);
  }

  // Reference for parallax image
  const imageRef = useRef<HTMLImageElement>(null);

  // Mouse movement parallax effect
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;

      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      // Move image slightly with mouse
      if (imageRef.current) {
        imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
      }
    }

    // Add mouse move listener
    window.addEventListener("mousemove", handleMouseMove);

    // Remove listener on cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Terms popup state
  const [showTerms, setShowTerms] = useState(false);

  // Terms checkbox state
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // User profile data
  const [profile, setProfile] = useState<any>(null);

  // Load profile info
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
        {/* Background image */}
        <div className="auth-bg">
          <img ref={imageRef} src="/images/home-image2.jpg" alt="background" />
        </div>

        <div className="auth-container">
          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="auth-form">
              <h1>Log In</h1>

              {/* Email input */}
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />

              {/* Password input */}
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />

              {/* Submit button */}
              <button className="submit" disabled={loading}>
                {loading ? "Loading..." : "Log In"}
              </button>

              {/* Switch to signup */}
              <div>
                <p>Need an account?</p>

                <p onClick={() => setMode("signup")} className="switch">
                  Sign Up
                </p>
              </div>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="auth-form">
              <h1>Sign Up</h1>

              {/* Username input */}
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              {/* Email input */}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {/* Password input */}
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {/* Terms checkbox */}
              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />

                <span>
                  I agree to the {/* Open terms popup */}
                  <button
                    type="button"
                    className="terms-btn"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms & Conditions
                  </button>
                </span>
              </label>

              {/* Signup button */}
              <button className="submit" disabled={loading || !acceptedTerms}>
                {loading ? "Loading..." : "Sign Up"}
              </button>

              {/* Switch to login */}
              <div>
                <p>Already have an account?</p>

                <p onClick={() => setMode("login")} className="switch">
                  Log In
                </p>
              </div>
            </form>
          )}

          {/* TERMS POPUP */}
          {showTerms && (
            <div className="popup-overlay">
              <div className="popup-box">
                {/* Close popup */}
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

                {/* Accept terms button */}
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

      {/* Popup message */}
      {popup.show && (
        <div className="auth-message">
          <div className="auth-message-box">
            {/* Close popup button */}
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

            {/* Popup text */}
            <p>{popup.text}</p>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
