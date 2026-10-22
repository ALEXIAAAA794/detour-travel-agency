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
    const error = new Error(
      data.error || data.message || "Une erreur est survenue."
    );
    error.status = response.status;
    throw error;
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
  try {
    return await request("/me", { method: "GET" });
  } catch (error) {
    // 401 = personne n'est connecté : cas normal, pas une erreur
    if (error.status === 401) return null;
    throw error;
  }
}

export async function logout() {
  return request("/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}