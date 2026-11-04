import '../css/Footer.css';

function Footer({ navigate }) {
  function handleLink(e, href) {
    if (href.startsWith('/#')) {
      const hash = href.substring(2);
      if (window.location.pathname === '/' || window.location.pathname === '') {
        e.preventDefault();
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (navigate) {
        e.preventDefault();
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else if (href.startsWith('/') && navigate) {
      e.preventDefault();
      navigate(href);
    }
  }

  return (
    <footer className="site-footer" id="contact">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand section */}
          <div className="footer-brand-section">
            <a href="/" className="footer-brand" onClick={(e) => handleLink(e, '/')}>
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
              <a href="/artists" onClick={(e) => handleLink(e, '/artists')}>Artists</a>
              <a href="/#categories" onClick={(e) => handleLink(e, '/#categories')}>Categories</a>
              <a href="/#how-it-works" onClick={(e) => handleLink(e, '/#how-it-works')}>How It Works</a>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <a href="/#about" onClick={(e) => handleLink(e, '/#about')}>About Us</a>
              <a href="/#faq" onClick={(e) => handleLink(e, '/#faq')}>Contact</a>
              <a href="/register?role=artist" onClick={(e) => handleLink(e, '/register?role=artist')}>Join as an Artist</a>
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
