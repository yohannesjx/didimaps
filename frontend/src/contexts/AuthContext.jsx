import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                logout();
            }
        } catch (err) {
            logout();
        } finally {
            setLoading(false);
        }
    };

    const requestOtp = async (phone) => {
        const res = await fetch('/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        if (!res.ok) throw new Error('Failed to send code');
        return await res.json();
    };

    const verifyOtp = async (phone, code) => {
        const res = await fetch('/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, code })
        });
        if (!res.ok) throw new Error('Failed to verify code');
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout, isAuthenticated: !!user, token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
