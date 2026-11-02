import '../css/Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand section */}
          <div className="footer-brand-section">
            <a href="/" className="footer-brand">
              <span className="footer-brand-text">TalentHire</span>
            </a>

            <p className="footer-brand-tagline">
              The fastest way to discover, preview, and book extraordinary live performers for unforgettable events.
            </p>

            <div className="footer-status-pill">
              <span className="status-indicator"></span>
              All artist verification systems operational
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Categories</h4>
              <a href="/#categories">Singers & Vocalists</a>
              <a href="/#categories">Dance Groups</a>
              <a href="/#categories">Live DJs & Producers</a>
              <a href="/#categories">Orchestra & Fusion</a>
              <a href="/#categories">Anchors & Emcees</a>
            </div>

            <div className="footer-col">
              <h4>Platform</h4>
              <a href="/#categories">Browse Talent</a>
              <a href="/#categories">Featured Artists</a>
              <a href="/#about">Verified Guarantee</a>
              <a href="/login">Direct Booking</a>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <a href="/#about">About Us</a>
              <a href="/#about">Our Story</a>
              <a href="/#about">Careers</a>
              <a href="/#about">Press & Media</a>
            </div>

            <div className="footer-col">
              <h4>Resources</h4>
              <a href="/#about">Documentation</a>
              <a href="/#about">Support Center</a>
              <a href="/#about">Terms of Service</a>
              <a href="/#about">Privacy Policy</a>
            </div>
          </div>
        </div>

        {/* Footer bottom bar */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            © {CURRENT_YEAR} TalentHire Technologies Inc. All rights reserved.
          </div>

          <div className="footer-tagline-small">
            Crafted for world-class celebrations & creative agencies.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
