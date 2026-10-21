
const API_URL = "/auth";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Une erreur est survenue."
    );
  }

  return data;
}

export async function login(email, password) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getSession() {
  return request("/me", {
    method: "GET",
  });
}

export async function logout() {
  return request("/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
