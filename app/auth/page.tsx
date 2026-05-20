"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AuthPage() {

  // =========================================================
  // SUPABASE AUTH STATE
  // =========================================================

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

  // =========================================================
  // AUTH PAGE STATE
  // =========================================================

  const [mode, setMode] = useState<"login" | "signup">("login");

  // SIGNUP
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // LOGIN
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // UI
  const [loading, setLoading] = useState(false);

  // =========================================================
  // POPUP SYSTEM
  // =========================================================

  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    text: "",
  });

  // =========================================================
  // SIGN UP FUNCTION
  // =========================================================

  async function handleSignUp(e: React.FormEvent) {

    e.preventDefault();

    setLoading(true);

    // ---------------------------------------------------------
    // CHECK IF USERNAME ALREADY EXISTS
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // CREATE ACCOUNT
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // HANDLE ERRORS
    // ---------------------------------------------------------

    if (error) {

      setPopup({
        show: true,
        type: "error",
        text: error.message,
      });

      setLoading(false);
      return;
    }

    // ---------------------------------------------------------
    // CREATE PROFILE ROW
    // ---------------------------------------------------------

    if (data.user) {

      await supabase.from("profiles").insert({
        id: data.user.id,
        username: username,
        email: email,
      });
    }

    // ---------------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------------

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

  // =========================================================
  // LOGIN FUNCTION
  // =========================================================

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

  // =========================================================
  // PARALLAX EFFECT
  // =========================================================

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {

    function handleMouseMove(e: MouseEvent) {

      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      if (imageRef.current) {
        imageRef.current.style.transform =
          `translate(${x}px, ${y}px) scale(1.05)`;
      }
    }

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };

  }, []);

  {/* =========================================================
        TERMS & CONDITIONS STATE
        - Add these near your other useState hooks
    ========================================================= */}
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

      {/* =====================================================
          AUTH SECTION
      ===================================================== */}
      <div className="auth-page">

        {/* BACKGROUND */}
        <div className="auth-bg">

          <img
            ref={imageRef}
            src="/images/home-image2.jpg"
            alt="background"
          />

        </div>

        {/* AUTH CARD */}
        <div className="auth-container">

          {/* LOGIN FORM */}
          {mode === "login" && (

            <form
              onSubmit={handleLogin}
              className="auth-form"
            >

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

                <p
                  onClick={() => setMode("signup")}
                  className="switch"
                >
                  Sign Up
                </p>
              </div>

            </form>
          )}

          {/* SIGNUP FORM */}
            {mode === "signup" && (

            <form
                onSubmit={handleSignUp}
                className="auth-form"
            >

                <h1>Sign Up</h1>

                {/* USERNAME */}
                <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                />

                {/* EMAIL */}
                <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                />

                {/* PASSWORD */}
                <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />

                {/* TERMS CHECKBOX */}
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

                {/* SUBMIT BUTTON */}
                <button className="submit"
                disabled={loading || !acceptedTerms}
                >
                {loading ? "Loading..." : "Sign Up"}
                </button>

                {/* SWITCH TO LOGIN */}
                <div>
                <p>Already have an account?</p>

                <p
                    onClick={() => setMode("login")}
                    className="switch"
                >
                    Log In
                </p>
                </div>

            </form>
            )}

            {/* =========================================================
                TERMS & CONDITIONS POPUP
            ========================================================= */}
            {showTerms && (

            <div className="popup-overlay">

                <div className="popup-box">

                {/* CLOSE BUTTON */}
                <button
                    className="popup-close"
                    onClick={() => setShowTerms(false)}
                >
                    ✕
                </button>

                <h2>Terms & Conditions</h2>

                <div className="popup-content">

                    <p>
                    By creating an account on NestOrg, you agree to:
                    </p>

                    <ul>
                    <li>Use the platform respectfully.</li>
                    <li>Not impersonate other users or organizations.</li>
                    <li>Not upload harmful or illegal content.</li>
                    <li>Keep your account credentials secure.</li>
                    <li>Follow Cavite State University community guidelines.</li>
                    </ul>

                    <p>
                    NestOrg reserves the right to suspend accounts
                    that violate these rules.
                    </p>

                </div>

                {/* ACCEPT BUTTON */}
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