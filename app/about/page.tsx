"use client";

import { useEffect } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Layout() {
  // Scroll-reveal: watches .reveal/.reveal-left/.reveal-right elements
  // and adds .visible when they enter the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.15 },
    );

    document
      .querySelectorAll(".reveal, .reveal-left, .reveal-right")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <main>
      {/* Top navigation */}
      <Header />

      {/* Hero section — title and subtitle animate via CSS fadeUp keyframe */}
      <section className="about-hero">
        <h1 className="about-title">About Us</h1>

        <p className="about-subtitle">
          Welcome to NestOrg, your central platform for discovering and engaging
          with student organizations and campus events at Cavite State
          University.
        </p>
      </section>

      {/* Main about content */}
      <section className="about-container">
        {/* Mission card */}
        <div className="about-card mission-card reveal">
          <h2>Our Mission</h2>

          <p>
            Our mission is to foster a vibrant campus community by connecting
            students with a wide range of extracurricular activities, clubs, and
            events that enrich their university experience.
          </p>
        </div>

        {/* Features / services section */}
        <div className="offer-section">
          <h2 className="offer-title reveal">What We Offer</h2>

          <div className="offer-grid">
            {/* Organization feature */}
            <div className="offer-card reveal reveal-delay-1">
              <div className="offer-icon"></div>

              <h3>Student Organizations</h3>

              <p>
                Discover and join a variety of student organizations that align
                with your interests and passions.
              </p>
            </div>

            {/* Events feature */}
            <div className="offer-card reveal reveal-delay-2">
              <div className="offer-icon"></div>

              <h3>Campus Events</h3>

              <p>
                Stay updated on the latest campus events and activities
                happening at Cavite State University.
              </p>
            </div>

            {/* Volunteer opportunities feature */}
            <div className="offer-card reveal reveal-delay-3">
              <div className="offer-icon"></div>

              <h3>Volunteer Opportunities</h3>

              <p>
                Find meaningful ways to give back to your community and gain
                valuable experience.
              </p>
            </div>
          </div>
        </div>

        {/* Call to action section */}
        <div className="about-cta reveal">
          <h2>Get Involved</h2>

          <p>
            Join our community and start exploring the diverse opportunities
            available to you at Cavite State University.
          </p>

          {/* Redirects users to organizations page */}
          <Link href="/orgs" className="about-btn">
            Explore Organizations
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
