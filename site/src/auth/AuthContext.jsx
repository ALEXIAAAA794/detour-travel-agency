import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const API = "http://localhost:4000/api";

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
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => setUser(data.user))
            .catch(() => localStorage.removeItem("detour_token"))
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de connexion");
        localStorage.setItem("detour_token", data.token);
        setUser(data.user);
        return data.user;
    }

    async function register(name, email, password) {
        const res = await fetch(`${API}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
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
