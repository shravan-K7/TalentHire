import '../css/Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand section */}
          <div className="footer-brand-section">
            <a href="/" className="footer-brand">
              <span className="footer-brand-white">Talent</span>
              <span className="footer-brand-orange">Hire</span>
            </a>
            <p className="footer-brand-tagline">
              Book performing artists for every celebration.
            </p>
          </div>

          {/* Navigation Links Columns */}
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Explore</h4>
              <a href="/artists">Artists</a>
              <a href="/artists">Categories</a>
              <a href="/#about">How It Works</a>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <a href="/#about">About Us</a>
              <a href="/profile?tab=support">Contact</a>
              <a href="/register?role=artist">Join as an Artist</a>
            </div>

            <div className="footer-col">
              <h4>Follow Us</h4>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
            </div>
          </div>
        </div>

        {/* Footer bottom bar */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            © TalentHire. Terms · Privacy
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
