/**
 * Admin API Service for TalentHire Administration.
 * Connects directly to Django /api/admin/ endpoints.
 */

import { getCsrfToken } from '../js/auth';

const BASE_URL = '/api/admin';

async function handleResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// 1. Overview KPIs & Analytics
export async function fetchAdminOverview() {
  const response = await fetch(`${BASE_URL}/overview/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// 2. Users Management
export async function fetchAdminUsers({ search = '', role = 'all', status = 'all', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    search,
    role,
    status,
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await fetch(`${BASE_URL}/users/?${params.toString()}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function toggleUserStatus(userId) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/users/${userId}/toggle-status/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
  });
  return handleResponse(response);
}

// 3. Artists & Verifications
export async function fetchAdminArtists({ search = '', status = 'all', categoryId = '' } = {}) {
  const params = new URLSearchParams({ search, status });
  if (categoryId) params.append('category_id', categoryId);
  const response = await fetch(`${BASE_URL}/artists/?${params.toString()}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchVerificationQueue() {
  const response = await fetch(`${BASE_URL}/artists/verifications/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function verifyArtistAction(artistId, action, reason = '') {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/artists/${artistId}/verify/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ action, reason }),
  });
  return handleResponse(response);
}

// 4. Bookings Management
export async function fetchAdminBookings({ search = '', status = 'all', fromDate = '', toDate = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    search,
    status,
    from_date: fromDate,
    to_date: toDate,
    page: String(page),
  });
  const response = await fetch(`${BASE_URL}/bookings/?${params.toString()}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchAdminBookingDetail(bookingId) {
  const response = await fetch(`${BASE_URL}/bookings/${bookingId}/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// 5. Financial Management
export async function fetchAdminTransactions({ search = '', status = 'all' } = {}) {
  const params = new URLSearchParams({ search, status });
  const response = await fetch(`${BASE_URL}/finance/transactions/?${params.toString()}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchAdminRefunds() {
  const response = await fetch(`${BASE_URL}/finance/refunds/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// 6. Categories
export async function fetchAdminCategories() {
  const response = await fetch(`${BASE_URL}/categories/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function createAdminCategory({ name, description }) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/categories/create/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ name, description }),
  });
  return handleResponse(response);
}

export async function editAdminCategory(categoryId, { name, description }) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/categories/${categoryId}/edit/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ name, description }),
  });
  return handleResponse(response);
}

// 7. Complaints & Support
export async function fetchAdminComplaints() {
  const response = await fetch(`${BASE_URL}/complaints/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function resolveAdminComplaint(complaintId, resolution) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/complaints/${complaintId}/resolve/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ resolution }),
  });
  return handleResponse(response);
}

// 8. Reviews
export async function fetchAdminReviews() {
  const response = await fetch(`${BASE_URL}/reviews/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function deleteAdminReview(reviewId) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/reviews/${reviewId}/delete/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
  });
  return handleResponse(response);
}

// 9. Notifications / Broadcast Announcements
export async function fetchAdminAnnouncements() {
  const response = await fetch(`${BASE_URL}/notifications/history/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function sendAdminAnnouncement({ title, message, recipientType = 'all' }) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${BASE_URL}/notifications/send/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ title, message, recipient_type: recipientType }),
  });
  return handleResponse(response);
}

// 10. Chatbot Monitoring
export async function fetchAdminChatbotStats(page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await fetch(`${BASE_URL}/chatbot/?${params.toString()}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// 11. Reports & Analytics
export async function fetchAdminReports() {
  const response = await fetch(`${BASE_URL}/reports/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export function getExportCsvUrl(type = 'bookings') {
  return `${BASE_URL}/reports/export-csv/?type=${encodeURIComponent(type)}`;
}

// 12. Settings & Activity Logs
export async function fetchAdminSettings() {
  const response = await fetch(`${BASE_URL}/settings/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchAdminActivityLogs() {
  const response = await fetch(`${BASE_URL}/activity-logs/`, {
    credentials: 'include',
  });
  return handleResponse(response);
}
