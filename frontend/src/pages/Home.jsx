function Home({ user, onLogout }) {
  return (
    <main>
      <header>
        <h1>TalentHire</h1>

        <nav>
          <a href="#home">Home</a>{' | '}
          <a href="#about">About</a>{' | '}
          <a href="#categories">Browse Categories</a>{' | '}
          <span>Signed in as <strong>{user.username}</strong></span>{' | '}
          <button type="button" onClick={onLogout}>Logout</button>
        </nav>
      </header>

      <hr />

      <section id="home">
        <h2>Welcome to TalentHire, {user.username}!</h2>
        <p>Find and book talented performers for your next event.</p>
        <p>Discover singers, DJs, dance groups, orchestra groups, anchors, band groups, and more for every occasion.</p>
        <button type="button" onClick={() => alert('Artist exploration coming soon!')}>
          Explore Artists
        </button>
      </section>

      <hr />

      <section id="categories">
        <h2>Browse Categories</h2>
        <ul>
          <li>Singers</li>
          <li>Dance Groups</li>
          <li>DJs</li>
          <li>Orchestra Groups</li>
          <li>Anchors</li>
          <li>Band Groups</li>
        </ul>
      </section>

      <hr />

      <section id="about">
        <h2>About TalentHire</h2>
        <p>
          TalentHire is your premier platform to connect with verified performers, musicians,
          and entertainers. Easily discover talent and make your celebrations memorable.
        </p>
      </section>

      <hr />

      <footer>
        <p>TalentHire &mdash; Find the perfect talent for your event.</p>
      </footer>
    </main>
  );
}

export default Home;