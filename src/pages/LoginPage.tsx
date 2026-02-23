import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Code2, Eye, EyeOff, Loader2, Lock, Mail, User, Briefcase, Building2 } from 'lucide-react';

export function LoginPage() {
    const { login, register } = useAuth();
    const { t } = useLanguage();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [role, setRole] = useState('developer');
    const [department, setDepartment] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (mode === 'register' && password !== confirmPw) {
            setError(t.login.passwordMismatch);
            return;
        }
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(name, email, password, role, department || undefined);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t.login.error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#ff6b35] rounded-full opacity-10 blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#2196f3] rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500 rounded-full opacity-5 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] shadow-lg shadow-orange-500/30 mb-4">
                        <Code2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Dxv4TH</h1>
                    <p className="text-gray-400 mt-1 text-sm">{t.login.subtitle}</p>
                </div>

                {/* Card */}
                <div className="bg-[#111] border border-white/8 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="flex mb-6 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-[#ff6b35] text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t.login.loginTab}
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-[#ff6b35] text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t.login.registerTab}
                        </button>
                    </div>

                    <h2 className="text-xl font-semibold text-white mb-6 text-center">
                        {mode === 'login' ? t.login.title : t.login.registerTitle}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.login.name}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        placeholder={t.login.namePlaceholder}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.login.email}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    placeholder="email@Dxv4TH.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.login.password}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors"
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.login.confirmPassword}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={confirmPw}
                                        onChange={e => setConfirmPw(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Role (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.login.role}</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors appearance-none cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                                    >
                                        <option value="developer">{t.login.roleDeveloper}</option>
                                        <option value="designer">{t.login.roleDesigner}</option>
                                        <option value="tester">{t.login.roleTester}</option>
                                        <option value="manager">{t.login.roleManager}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Department (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.login.department}</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors appearance-none cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                                    >
                                        <option value="">{t.login.selectDepartment}</option>
                                        <option value="Engineering">{t.login.deptEngineering}</option>
                                        <option value="Design">{t.login.deptDesign}</option>
                                        <option value="QA">{t.login.deptQA}</option>
                                        <option value="Management">{t.login.deptManagement}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'login' ? t.login.loading : t.login.registering}</> : mode === 'login' ? t.login.submit : t.login.registerSubmit}
                        </button>
                    </form>



                    {/* Switch mode link */}
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                            className="text-xs text-gray-400 hover:text-[#ff6b35] transition-colors"
                        >
                            {mode === 'login' ? t.login.noAccount : t.login.hasAccount}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
