const API = '/api/auth'

// Read the response safely to prevent unexpected JSON parse exceptions
async function readResponse(response) {
  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `Server returned an invalid response. Status: ${response.status}`
    )
  }
}

// Get CSRF token from Django
export async function getCsrfToken() {
  const response = await fetch(`${API}/csrf/`, {
    credentials: 'include',
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Unable to get CSRF token')
  }

  return data.csrfToken
}

// Register user
export async function registerUser({ username, email, password }) {
  const token = await getCsrfToken()

  const response = await fetch(`${API}/register/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    const errorMsg = data.error || (data.errors ? JSON.stringify(data.errors) : 'Registration failed.')
    throw new Error(errorMsg)
  }

  return data
}

// Login user
export async function loginUser(usernameOrEmail, password) {
  const token = await getCsrfToken()

  const response = await fetch(`${API}/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({
      username_or_email: usernameOrEmail,
      password: password,
    }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    const errors = data.errors
      ? Object.values(data.errors)
        .flat()
        .map((error) => error.message)
        .join(' ')
      : data.error

    throw new Error(errors || 'Login failed')
  }

  return data
}

// Google login
export async function googleLogin(credential) {
  const token = await getCsrfToken()

  const response = await fetch(`${API}/google/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({ credential }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Google sign-in failed.')
  }

  return data
}

// Get currently logged-in user
export async function getCurrentUser() {
  const response = await fetch(`${API}/me/`, {
    credentials: 'include',
  })

  if (response.status === 401) {
    return null
  }

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Unable to get user')
  }

  return data
}

// Logout user
export async function logoutUser() {
  const token = await getCsrfToken()

  const response = await fetch(`${API}/logout/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRFToken': token,
    },
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Logout failed')
  }

  return data
}
