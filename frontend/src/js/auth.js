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
export async function registerUser({ username, email, password, role }) {
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
      role,
    }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    const errorMsg = data.error || (data.errors ? JSON.stringify(data.errors) : 'Registration failed.')
    throw new Error(errorMsg)
  }

  return data
}

// Check username availability
export async function checkUsernameAvailability(username, signal = null) {
  const options = {
    method: 'GET',
    credentials: 'include',
  };
  if (signal) {
    options.signal = signal;
  }
  const response = await fetch(
    `${API}/check-username/?username=${encodeURIComponent(username)}`,
    options
  );
  const data = await readResponse(response);
  if (!response.ok) {
    throw new Error(data.error || 'Unable to check username.');
  }
  return data;
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
export async function googleLogin(credential, role = 'customer') {
  const token = await getCsrfToken()

  const response = await fetch(`${API}/google/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({ credential, role }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Google sign-in failed.')
  }

  return data
}

// Fetch all artists with optional filter query string
export async function fetchArtists(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val)
    }
  })

  const qs = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`/api/artists/${qs}`, {
    credentials: 'include',
  })

  const data = await readResponse(response)
  if (!response.ok) {
    throw new Error(data.error || 'Unable to load artists.')
  }
  return data
}

// Fetch single artist details by ID
export async function fetchArtistDetail(artistId) {
  const response = await fetch(`/api/artists/${artistId}/`, {
    credentials: 'include',
  })

  const data = await readResponse(response)
  if (!response.ok) {
    throw new Error(data.error || 'Artist profile not found.')
  }
  return data.artist
}

// Create a booking request for an artist
export async function createBooking(bookingData) {
  const token = await getCsrfToken()

  const response = await fetch('/api/bookings/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify(bookingData),
  })

  const data = await readResponse(response)
  if (!response.ok) {
    throw new Error(data.error || 'Unable to submit booking request.')
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

// ============================================================================
// Customer Dashboard APIs
// ============================================================================

export async function fetchCustomerDashboard() {
  const response = await fetch('/api/customer/dashboard/', {
    credentials: 'include',
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load customer dashboard data.')
  }

  return data
}

export async function updateCustomerProfile(payload) {
  const token = await getCsrfToken()

  const isFormData = payload instanceof FormData
  const headers = {
    'X-CSRFToken': token,
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch('/api/customer/profile/', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: isFormData ? payload : JSON.stringify(payload),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update profile.')
  }

  return data
}

export async function changeCustomerPassword({ current_password, new_password, confirm_password }) {
  const token = await getCsrfToken()

  const response = await fetch('/api/customer/change-password/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({ current_password, new_password, confirm_password }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to change password.')
  }

  return data
}

export async function deactivateCustomerAccount({ password, confirm = true }) {
  const token = await getCsrfToken()

  const response = await fetch('/api/customer/deactivate/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({ password, confirm }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to deactivate account.')
  }

  return data
}

export async function toggleFavoriteArtist(artistId) {
  const token = await getCsrfToken()

  const response = await fetch(`/api/customer/favorites/${artistId}/toggle/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRFToken': token,
    },
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update favorites.')
  }

  return data
}

export async function cancelCustomerBooking(bookingId) {
  const token = await getCsrfToken()

  const response = await fetch(`/api/customer/bookings/${bookingId}/cancel/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRFToken': token,
    },
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to cancel booking.')
  }

  return data
}

export async function markNotificationsRead() {
  const token = await getCsrfToken()

  const response = await fetch('/api/customer/notifications/mark-read/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRFToken': token,
    },
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to mark notifications as read.')
  }

  return data
}

export async function submitSupportInquiry({ subject, message }) {
  const token = await getCsrfToken()

  const response = await fetch('/api/customer/support/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
    },
    body: JSON.stringify({ subject, message }),
  })

  const data = await readResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit support request.')
  }

  return data
}

