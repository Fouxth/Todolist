import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '@/types';

interface AuthContextType {
    token: string | null;
    currentUser: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, role?: string, department?: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const savedToken = localStorage.getItem('auth_token');
        if (!savedToken) return;
        try {
            const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${savedToken}` }
            });
            if (res.ok) {
                const user: User = await res.json();
                setCurrentUser(user);
            }
        } catch {
            // silently fail
        }
    }, []);

    // Verify token on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        if (!savedToken) { setIsLoading(false); return; }

        fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((user: User) => { setCurrentUser(user); setToken(savedToken); })
            .catch(() => { localStorage.removeItem('auth_token'); setToken(null); })
            .finally(() => setIsLoading(false));
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'เข้าสู่ระบบไม่สำเร็จ');
        }
        const data = await res.json();
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
    }, []);

    const register = useCallback(async (name: string, email: string, password: string, role?: string, department?: string) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, department })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'สมัครสมาชิกไม่สำเร็จ');
        }
        const data = await res.json();
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setCurrentUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ token, currentUser, isLoading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
