import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const API = "/client-api/api";

async function request(endpoint, options) {
    let response;
    try {
        response = await fetch(`${API}${endpoint}`, options);
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error("Le service client est indisponible. Démarrez l’API depuis le dossier server avec « npm start ».");
        }
        throw error;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || "La demande d’authentification a échoué.");
        error.status = response.status;
        throw error;
    }
    return data;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("detour_token");
        if (!token) {
            setLoading(false);
            return;
        }
        fetch(`${API}/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (r) => {
                if (!r.ok) {
                    const error = new Error("La session client a expiré.");
                    error.status = r.status;
                    throw error;
                }
                return r.json();
            })
            .then((data) => setUser(data.user))
            .catch((error) => {
                localStorage.removeItem("detour_token");
                if (error.status !== 401) {
                    console.error("Impossible de restaurer la session client.", error);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const data = await request("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("detour_token", data.token);
        setUser(data.user);
        return data.user;
    }

    async function register(name, email, password) {
        const data = await request("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        localStorage.setItem("detour_token", data.token);
        setUser(data.user);
        return data.user;
    }

    function logout() {
        localStorage.removeItem("detour_token");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
