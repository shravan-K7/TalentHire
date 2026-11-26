import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Mic,
  Compass,
  Eye,
  Search,
  Calendar,
  CreditCard,
  User,
  ClipboardList,
  CheckSquare,
  Tag,
  ShieldCheck,
  CalendarCheck,
  Sparkles,
  Mail,
} from "lucide-react";
import "../css/AboutUs.css";

const CATEGORIES = [
  { name: "Singers", query: "Singers & Vocalists" },
  { name: "DJs", query: "Live DJs & Producers" },
  { name: "Dancers", query: "Dance Groups" },
  { name: "Live bands", query: "Live Bands & Ensembles" },
  { name: "Anchors & emcees", query: "Anchors & Emcees" },
  { name: "Instrumentalists", query: "Orchestra & Instrumental" },
];

const WHAT_WE_OFFER = [
  {
    icon: Search,
    title: "Easy artist discovery",
    description: "Search and filter by category, location and budget.",
  },
  {
    icon: Calendar,
    title: "Online booking requests",
    description: "Send a request for your date in a few taps.",
  },
  {
    icon: CreditCard,
    title: "Secure online payments",
    description: "Pay safely through the platform.",
  },
  {
    icon: User,
    title: "Artist profiles & portfolios",
    description: "Samples, pricing and experience in one place.",
  },
  {
    icon: ClipboardList,
    title: "Booking management",
    description: "Track requests and confirmations from your account.",
  },
];

const WHY_CHOOSE_US = [
  {
    icon: CheckSquare,
    title: "Simple booking process",
    description: "From search to request in minutes.",
  },
  {
    icon: Tag,
    title: "Transparent pricing",
    description: "Starting prices shown upfront on every profile.",
  },
  {
    icon: ShieldCheck,
    title: "Secure payments",
    description: "Payments handled securely online.",
  },
  {
    icon: CalendarCheck,
    title: "Convenient booking management",
    description: "Everything tracked in one dashboard.",
  },
  {
    icon: Sparkles,
    title: "Artist discovery",
    description: "Find the right performer for any event.",
  },
];

export default function AboutUs({ user, onLogout, navigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function goTo(path) {
    if (navigate) {
      navigate(path);
    } else {
      window.location.href = path;
    }
  }

  return (
    <div className="about-page-root">
      <Navbar
        user={user}
        onLogout={onLogout}
        currentPath="/about"
        navigate={navigate}
      />

      <main className="about-main-container">
        {/* =================================================================
            SECTION 1: HERO (Where talent meets opportunity)
            ================================================================= */}
        <section className="about-hero-grid" aria-labelledby="aboutHeroTitle">
          <div className="about-hero-left">
            <span className="about-badge">About TalentHire</span>
            <h1 id="aboutHeroTitle" className="about-hero-title">
              Where talent meets
              <br />
              opportunity.
            </h1>
            <p className="about-hero-desc">
              TalentHire is an online platform that makes it easy to find,
              compare and book live performers for weddings, corporate events,
              parties and every celebration in between.
            </p>
            <button
              type="button"
              className="about-btn-primary"
              onClick={() => goTo("/artists")}
            >
              Explore artists
            </button>
          </div>

          <div className="about-hero-banner" role="img" aria-label="Event performance banner">
            <img
              src="/images/about-banner.jpg"
              alt="Live stage event performance"
              className="about-hero-banner-img"
            />
          </div>
        </section>

        {/* =================================================================
            SECTION 2: WHO WE ARE (An artist booking platform built for events)
            ================================================================= */}
        <section className="about-who-grid" aria-labelledby="aboutWhoTitle">
          <div>
            <span className="about-badge">Who we are</span>
            <h2 id="aboutWhoTitle" className="about-section-title">
              An artist booking platform built for
              <br />
              events
            </h2>
          </div>

          <div>
            <p className="about-who-text">
              TalentHire connects customers with talented performers. Customers
              can discover artists, review their profiles and pricing, and send
              booking requests online. Artists get a professional space to
              showcase their work and reach new clients.
            </p>

            <div className="about-pills-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  className="about-category-pill"
                  onClick={() => goTo(`/artists?category=${encodeURIComponent(cat.query)}`)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            SECTION 3: MISSION & VISION CARDS
            ================================================================= */}
        <section className="about-mv-grid" aria-label="Our mission and vision">
          <div className="about-mission-card">
            <div className="about-mv-icon-wrap">
              <Compass size={24} />
            </div>
            <div>
              <h3>Our mission</h3>
              <p>To make artist booking simple, accessible and reliable for everyone.</p>
            </div>
          </div>

          <div className="about-vision-card">
            <div className="about-mv-icon-wrap">
              <Eye size={24} />
            </div>
            <div>
              <h3>Our vision</h3>
              <p>To become a trusted platform for artist bookings.</p>
            </div>
          </div>
        </section>

        {/* =================================================================
            SECTION 4: WHAT WE OFFER (5 Feature Cards Grid)
            ================================================================= */}
        <section aria-labelledby="aboutOfferTitle">
          <span className="about-badge">What we offer</span>
          <h2 id="aboutOfferTitle" className="about-section-title">
            Everything you need to book with confidence
          </h2>

          <div className="about-offer-grid">
            {WHAT_WE_OFFER.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="about-offer-card">
                  <div className="about-card-icon-box">
                    <IconComp size={22} />
                  </div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================================
            SECTION 5: BUILT FOR BOTH SIDES OF THE STAGE
            ================================================================= */}
        <section aria-labelledby="aboutSidesTitle">
          <span className="about-badge">Who can use TalentHire</span>
          <h2 id="aboutSidesTitle" className="about-section-title">
            Built for both sides of the stage
          </h2>

          <div className="about-sides-grid">
            {/* Customers Card */}
            <div className="about-side-card">
              <div className="about-card-icon-box">
                <Search size={22} />
              </div>
              <h3>Customers</h3>
              <p className="about-side-subtitle">
                Discover artists and book performers for events.
              </p>
              <ul className="about-side-list">
                <li>
                  <span className="about-side-bullet">•</span>
                  <span>Browse by category and location</span>
                </li>
                <li>
                  <span className="about-side-bullet">•</span>
                  <span>Compare pricing and experience</span>
                </li>
                <li>
                  <span className="about-side-bullet">•</span>
                  <span>Send booking requests online</span>
                </li>
              </ul>
            </div>

            {/* Artists Card */}
            <div className="about-side-card">
              <div className="about-card-icon-box">
                <Mic size={22} />
              </div>
              <h3>Artists</h3>
              <p className="about-side-subtitle">
                Showcase talent, manage bookings and receive opportunities.
              </p>
              <ul className="about-side-list">
                <li>
                  <span className="about-side-bullet">•</span>
                  <span>Create a profile and portfolio</span>
                </li>
                <li>
                  <span className="about-side-bullet">•</span>
                  <span>Manage incoming requests</span>
                </li>
                <li>
                  <span className="about-side-bullet">•</span>
                  <span>Get discovered by new clients</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =================================================================
            SECTION 6: WHY CHOOSE TALENTHIRE (Simple, clear and secure)
            ================================================================= */}
        <section aria-labelledby="aboutWhyTitle">
          <span className="about-badge">Why choose TalentHire</span>
          <h2 id="aboutWhyTitle" className="about-section-title">
            Simple, clear and secure
          </h2>

          <div className="about-why-grid">
            {WHY_CHOOSE_US.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="about-why-card">
                  <div className="about-card-icon-box">
                    <IconComp size={22} />
                  </div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================================
            SECTION 7: CTA (Ready to get started?)
            ================================================================= */}
        <section className="about-cta-box" aria-labelledby="aboutCtaTitle">
          <h2 id="aboutCtaTitle" className="about-cta-title">
            Ready to get started?
          </h2>
          <p className="about-cta-desc">
            Find the right performer for your next event, or join TalentHire and
            get booked.
          </p>
          <div className="about-cta-actions">
            <button
              type="button"
              className="about-btn-primary"
              onClick={() => goTo("/artists")}
            >
              Explore artists
            </button>
            <button
              type="button"
              className="about-btn-secondary"
              onClick={() => goTo("/register?role=artist")}
            >
              Join as an artist
            </button>
          </div>
        </section>

        {/* =================================================================
            SECTION 8: GET IN TOUCH (Support Email only per prompt)
            ================================================================= */}
        <section className="about-contact-section" aria-labelledby="aboutContactTitle">
          <span className="about-badge">Contact</span>
          <h2 id="aboutContactTitle" className="about-section-title">
            Get in touch
          </h2>

          <a
            href="mailto:support@talenthire.com"
            className="about-contact-card"
            title="Send an email to TalentHire Support"
          >
            <div className="about-contact-icon-wrap">
              <Mail size={24} />
            </div>
            <div>
              <span className="about-contact-label">Support email</span>
              <p className="about-contact-value">support@talenthire.com</p>
            </div>
          </a>
        </section>
      </main>

      <Footer user={user} navigate={navigate} />
    </div>
  );
}
