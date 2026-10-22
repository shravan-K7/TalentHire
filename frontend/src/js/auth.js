
const API = '/api/auth'

// Read the response safely
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
  const response = await fetch(`/api/auth/csrf/`, {
    credentials: 'include',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Unable to get CSRF token')
  }

  return data.csrfToken
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

// Get currently logged-in user
export async function getCurrentUser() {
  try {
    const response = await fetch(`/api/auth/me/`, {
      credentials: 'include',
    })

    if (response.status === 401) {
      return null
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Unable to get user')
    }
    return data
  } catch (error) {
    throw error
  }
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
