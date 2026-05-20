"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function Layout() {
  return (
    <main>

      <Header />

      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <section className="about-hero">

        <h1 className="about-title">About Us</h1>

        <p className="about-subtitle">
          Welcome to NestOrg, your central platform for discovering
          and engaging with student organizations and campus events
          at Cavite State University.
        </p>

      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      <section className="about-container">

        {/* ========================= MISSION ========================= */}
        <div className="about-card mission-card">

          <h2>Our Mission</h2>

          <p>
            Our mission is to foster a vibrant campus community by
            connecting students with a wide range of extracurricular
            activities, clubs, and events that enrich their university
            experience.
          </p>

        </div>

        {/* ========================= WHAT WE OFFER ========================= */}
        <div className="offer-section">

          <h2 className="offer-title">What We Offer</h2>

          <div className="offer-grid">

            {/* CARD 1 */}
            <div className="offer-card">

              <div className="offer-icon">
                
              </div>

              <h3>Student Organizations</h3>

              <p>
                Discover and join a variety of student organizations
                that align with your interests and passions.
              </p>

            </div>

            {/* CARD 2 */}
            <div className="offer-card">

              <div className="offer-icon">
                
              </div>

              <h3>Campus Events</h3>

              <p>
                Stay updated on the latest campus events and
                activities happening at Cavite State University.
              </p>

            </div>

            {/* CARD 3 */}
            <div className="offer-card">

              <div className="offer-icon">
                
              </div>

              <h3>Volunteer Opportunities</h3>

              <p>
                Find meaningful ways to give back to your community
                and gain valuable experience.
              </p>

            </div>

          </div>

        </div>

        {/* ========================= CTA ========================= */}
        <div className="about-cta">

          <h2>Get Involved</h2>

          <p>
            Join our community and start exploring the diverse
            opportunities available to you at Cavite State University.
          </p>

          <Link href="/orgs" className="about-btn">
            Explore Organizations
          </Link>

        </div>

      </section>

      <Footer />

    </main>
  );
}