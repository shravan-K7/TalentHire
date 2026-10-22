import { getCsrfToken } from "../js/auth";
import { useState } from "react";

function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    function handleChange(event) {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value,
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage('')
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        try {
            const csrfToken = await getCsrfToken()
            const response = await fetch('/api/auth/register/',{
                method:'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                })
            })

            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(
                    data.error || `Request failed: HTTP ${response.status}`
                )
            }
            setMessage('Registration successful! You can now log in.')
            setError('')
        } catch (err) {
            console.error('Registration error:', err)
            setError(err.message || 'Unable to connect to the server.')
        }
    }

    return (
        <main>
            <h1>TalentHire</h1>
            <h2>Create an Account</h2>
            <p>Register to discover and book talented artists.</p>

            {message && <p role="status">{message}</p>}
            {error && <p role="alert">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username</label>
                    <br />
                    <input 
                    id="username"
                    name="username"
                    type="text" 
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    />
                </div>
                <br />
                <div>
                    <label htmlFor="email">Email</label>
                    <br />
                    <input 
                    id="email"
                    name="email"
                    type="email" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    />
                </div>
                <br />
                <div>
                    <label htmlFor="password">Password</label>
                    <br />
                    <input 
                    id="password"
                    name="password"
                    type="password" 
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    />
                </div>
                <br />
                <div>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <br />
                    <input 
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password" 
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    />
                </div>
                <br />

                <button type="submit">Register</button>
            </form>

            <p>
                Already have an account?{' '}
                <a href="/login">Login here</a>
            </p>
        </main>
    )
}

export default Register;