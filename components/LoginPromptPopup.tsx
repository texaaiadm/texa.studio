import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPromptPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginPromptPopup: React.FC<LoginPromptPopupProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleLogin = () => {
        onClose();
        navigate('/login');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
            {/* Popup Container */}
            <div className="relative w-full max-w-md mx-4 glass rounded-3xl border border-white/20 shadow-2xl animate-scaleIn">
                {/* Header with Icon */}
                <div className="text-center pt-10 pb-6 px-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/50">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-3">
                        Login Diperlukan
                    </h2>
                    <p className="text-lg text-slate-300 leading-relaxed">
                        Silakan login terlebih dahulu untuk melanjutkan pembelian dan mengakses AI tools premium
                    </p>
                </div>

                {/* Buttons */}
                <div className="px-6 pb-8 space-y-3">
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 rounded-xl font-black text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/50 transition-all duration-300 active:scale-95"
                    >
                        🔐 Login Sekarang
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl font-bold text-sm glass border border-white/10 text-slate-300 hover:bg-white/5 transition-all duration-300 active:scale-95"
                    >
                        Nanti Saja
                    </button>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default LoginPromptPopup;
