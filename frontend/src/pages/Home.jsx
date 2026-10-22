function Home({ user, onLogout }) {
    return (
        <main>
            <header>
                <h1>TalentHire</h1>

                <nav>
                    <a href="#home">Home</a>{' | '}
                    <a href="#artists">Explore Artists</a>{' | '}
                    <a href="#bookings">My Bookings</a>{' | '}
                    <button onClick={onLogout}>Logout</button>
                </nav>
            </header>

            <hr />

            <section id="home">
                <h2>Welcome to TalentHire, {user.username}!</h2>

                <p>Find and book talented performers for your next event.</p>

                <p>Discover singers,Djs,Dancers,orchestras,anchors,bands, and more for every occasion.</p>

                <button onClick={() => alert('Artist browsing coming soon!')}>Explore Artists</button>
            </section>

            <hr />

            <section>
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

            <footer>
                <p>TalentHire — Find the perfect talent for your event.</p>
            </footer>
        </main>
    )
}

export default Home;