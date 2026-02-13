
import React, { useState, useEffect } from 'react';
import { AITool } from '../types';
import { formatIDR, subscribeToSettings, SubscriptionSettings, DEFAULT_SETTINGS } from '../services/supabaseSubscriptionService';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../services/supabaseAuthService';
import { isUrlIframeAllowed, isUrlImageAllowed } from '../utils/iframePolicy';
import { checkExtensionInstalled, parseYouTubeToEmbed } from '../services/extensionService';
import { usePopupState } from '../services/popupContext';
import ExtensionWarningPopup from './ExtensionWarningPopup';
import CheckoutPopup from './CheckoutPopup';
import { pushRecentOpenedTool } from '../utils/recentTools';

interface CompactToolCardProps {
    tool: AITool;
    hasAccess: boolean;
}

const CompactToolCard: React.FC<CompactToolCardProps> = ({ tool, hasAccess }) => {
    const navigate = useNavigate();
    const [injecting, setInjecting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);
    const [showExtensionWarning, setShowExtensionWarning] = useState(false);
    const [showVideoPopup, setShowVideoPopup] = useState(false);
    const [settings, setSettings] = useState<SubscriptionSettings>(DEFAULT_SETTINGS);
    const [imageFailed, setImageFailed] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Register popup states
    usePopupState(showCheckoutPopup || showExtensionWarning || showVideoPopup);

    // Subscribe to settings
    useEffect(() => {
        const unsubscribe = subscribeToSettings((fetchedSettings) => {
            setSettings(fetchedSettings);
        });
        return () => unsubscribe();
    }, []);

    const tryOpenViaExtension = async (): Promise<boolean> => {
        // Use a timeout for getSession to prevent hanging when Supabase is slow after reload
        let idToken: string | null = null;
        try {
            const session = await Promise.race([
                getSession(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
            ]);
            idToken = session?.access_token || null;
        } catch (e) {
            console.warn('getSession failed, proceeding without token:', e);
        }

        console.log('🔧 CompactToolCard tryOpenViaExtension:', { toolId: tool.id, targetUrl: tool.targetUrl, hasToken: !!idToken });

        if (window.TEXAExtension && window.TEXAExtension.ready) {
            try {
                console.log('🔧 Using TEXAExtension global object');
                const result = await window.TEXAExtension.openTool(tool.id, tool.targetUrl, tool.apiUrl, tool.cookiesData || null, idToken);
                return result !== false;
            } catch (error) {
                console.error('Extension open tool failed:', error);
                return false;
            }
        }

        const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        console.log('🔧 Using postMessage with requestId:', requestId);

        return await new Promise<boolean>((resolve) => {
            const timeoutId = window.setTimeout(() => {
                console.log('⚠️ CompactToolCard: Extension ACK timeout (3s)');
                window.removeEventListener('message', onAck);
                resolve(false);
            }, 3000);

            const onAck = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                const data = (event.data || {}) as any;
                if (data.type !== 'TEXA_OPEN_TOOL_ACK') return;
                if (data.requestId !== requestId) return;
                console.log('✅ CompactToolCard: ACK received', data);
                window.clearTimeout(timeoutId);
                window.removeEventListener('message', onAck);
                resolve(Boolean(data.ok));
            };

            window.addEventListener('message', onAck);
            window.postMessage({
                type: 'TEXA_OPEN_TOOL',
                requestId,
                toolId: tool.id,
                idToken,
                targetUrl: tool.targetUrl,
                cookiesData: tool.cookiesData || null,
                apiUrl: tool.apiUrl || null
            }, window.location.origin);
        });
    };

    const handleClick = async () => {
        if (injecting) return; // Prevent double-clicks

        if (!hasAccess) {
            setShowCheckoutPopup(true);
            return;
        }

        pushRecentOpenedTool(tool.id);

        const canIframe = tool.openMode === 'iframe' && isUrlIframeAllowed(tool.targetUrl);
        if (canIframe) {
            navigate(`/tool/${tool.id}`);
            return;
        }

        setInjecting(true);
        setStatus("Memeriksa Extension...");

        const isExtensionInstalled = await checkExtensionInstalled();
        if (!isExtensionInstalled) {
            setInjecting(false);
            setStatus(null);
            setShowExtensionWarning(true);
            return;
        }

        setStatus("Membuka Tool...");

        try {
            const openedByExtension = await tryOpenViaExtension();

            if (openedByExtension) {
                setStatus("Berhasil!");
            } else {
                console.log('Extension failed to open tool, using fallback');
                setStatus("Membuka langsung...");
                window.open(tool.targetUrl, '_blank');
            }
        } catch (err) {
            console.error('Error opening tool:', err);
            setStatus("Membuka langsung...");
            window.open(tool.targetUrl, '_blank');
        } finally {
            setTimeout(() => {
                setInjecting(false);
                setStatus(null);
            }, 1000);
        }
    };

    const safeImageUrl = !imageFailed && isUrlImageAllowed(tool.imageUrl || '') ? tool.imageUrl : '';
    const embedUrl = parseYouTubeToEmbed(tool.embedVideoUrl || '');

    return (
        <>
            {/* Parallax Depth Card Structure */}
            <div
                className={`group relative h-full flex flex-col perspective-800 cursor-pointer ${isFocused ? 'focused' : ''}`}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    e.currentTarget.style.setProperty('--mouse-x', `${x / rect.width}`);
                    e.currentTarget.style.setProperty('--mouse-y', `${y / rect.height}`);
                    e.currentTarget.style.setProperty('--rotate-y', `${(x / rect.width) * 20}deg`);
                    e.currentTarget.style.setProperty('--rotate-x', `${(y / rect.height) * -20}deg`);
                    e.currentTarget.style.setProperty('--bg-x', `${(x / rect.width) * -20}px`); // Reduced movement for smaller container
                    e.currentTarget.style.setProperty('--bg-y', `${(y / rect.height) * -20}px`);
                }}
                onTouchMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    const x = touch.clientX - rect.left - rect.width / 2;
                    const y = touch.clientY - rect.top - rect.height / 2;
                    e.currentTarget.style.setProperty('--mouse-x', `${x / rect.width}`);
                    e.currentTarget.style.setProperty('--mouse-y', `${y / rect.height}`);
                    e.currentTarget.style.setProperty('--rotate-y', `${(x / rect.width) * 20}deg`);
                    e.currentTarget.style.setProperty('--rotate-x', `${(y / rect.height) * -20}deg`);
                    e.currentTarget.style.setProperty('--bg-x', `${(x / rect.width) * -20}px`);
                    e.currentTarget.style.setProperty('--bg-y', `${(y / rect.height) * -20}px`);
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('--rotate-y', '0deg');
                    e.currentTarget.style.setProperty('--rotate-x', '0deg');
                    e.currentTarget.style.setProperty('--bg-x', '0px');
                    e.currentTarget.style.setProperty('--bg-y', '0px');
                }}
                onClick={() => setIsFocused(!isFocused)}
            >
                <style>
                    {`
                    .perspective-800 { perspective: 800px; }
                    .parallax-card {
                        transform-style: preserve-3d;
                        transform: rotateY(var(--rotate-y, 0deg)) rotateX(var(--rotate-x, 0deg));
                        transition: transform 0.1s ease-out, box-shadow 0.3s ease;
                        /* Reference Style Normal */
                        box-shadow:
                          rgba(0, 0, 0, 0.66) 0 30px 60px 0,
                          inset #0f172a 0 0 0 5px,
                          inset rgba(255, 255, 255, 0.2) 0 0 0 6px;
                    }
                    .group:hover .parallax-card, .focused .parallax-card {
                        transition: transform 0.1s ease-out;
                        /* Reference Style Hover */
                        box-shadow:
                          rgba(255, 255, 255, 0.1) 0 0 40px 5px,
                          rgba(255, 255, 255, 0.2) 0 0 0 1px,
                          rgba(0, 0, 0, 0.66) 0 30px 60px 0,
                          inset #0f172a 0 0 0 5px,
                          inset rgba(255, 255, 255, 0.8) 0 0 0 6px;
                    }
                    .group:not(:hover):not(.focused) .parallax-card {
                        transition: transform 1s cubic-bezier(0.445, 0.05, 0.55, 0.95);
                    }
                    .parallax-bg {
                        transform: translateX(var(--bg-x, 0px)) translateY(var(--bg-y, 0px)) scale(1.15);
                        transition: transform 0.1s ease-out;
                    }
                    .group:not(:hover):not(.focused) .parallax-bg {
                         transition: transform 1s cubic-bezier(0.445, 0.05, 0.55, 0.95);
                    }
                    `}
                </style>

                {/* Inner Card Container (Fixed Height) with Reference Frame */}
                <div className="parallax-card relative w-full h-[320px] rounded-[10px] overflow-hidden bg-slate-900">

                    {/* Image Area - Absolute Top / Full for parallax effect */}
                    <div className="absolute top-0 left-0 right-0 h-[70%] z-0 overflow-hidden rounded-[10px]">
                        {safeImageUrl ? (
                            <img
                                src={safeImageUrl}
                                alt={tool.name}
                                className="parallax-bg w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                                loading="lazy"
                                onError={() => setImageFailed(true)}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="parallax-bg w-full h-full bg-slate-800 flex items-center justify-center">
                                <span className="text-slate-600 font-bold uppercase tracking-widest text-xs">{tool.category || 'AI TOOL'}</span>
                            </div>
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />

                        {/* Badges (Over Image) */}
                        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-indigo-600/90 backdrop-blur-md rounded-md text-[8px] font-bold text-white uppercase tracking-wide shadow-lg border border-white/10">
                            {tool.category}
                        </div>
                        {embedUrl && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowVideoPopup(true);
                                }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all"
                            >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Bottom: Content Area (Absolute Bottom, Slides Up) */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/30 backdrop-blur-md p-3 flex flex-col border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out max-h-[85%] rounded-b-[10px]">
                        <div className="mb-2">
                            <h3 className="text-xs sm:text-sm font-black text-white leading-tight mb-1 title-glow line-clamp-2 h-[2.5em]">
                                {tool.name}
                            </h3>
                        </div>

                        <div className="flex flex-col mt-auto">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                    {(() => {
                                        const toolAny = tool as any;
                                        const price7 = toolAny.price7Days ?? 0;
                                        const priceMonthly = tool.priceMonthly ?? 0;
                                        const price = price7 > 0 ? price7 : priceMonthly > 0 ? priceMonthly : (settings.defaultToolPrice || 15000);
                                        const duration = price7 > 0 ? 7 : 30;
                                        return (
                                            <div className="price-promo-glow !p-1.5 !rounded-lg !border-opacity-50">
                                                <span className="text-[7px] text-emerald-200/80 uppercase font-bold tracking-wider mb-0 leading-none">Mulai</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-black price-text-bold !text-emerald-400">{formatIDR(price)}</span>
                                                    <span className="text-[8px] text-emerald-200/60">/{duration}hr</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <button
                                    disabled={injecting}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClick();
                                    }}
                                    className="glowing-btn px-3 py-1.5 rounded-lg text-[9px] font-bold active:scale-95 shadow-lg flex items-center justify-center gap-1"
                                    style={{
                                        '--glow-color': injecting ? 'hsl(45, 100%, 50%)' : hasAccess ? 'hsl(140, 100%, 60%)' : 'hsl(190, 100%, 50%)'
                                    } as React.CSSProperties}
                                >
                                    <span className="glowing-txt">
                                        {injecting ? 'LOADING...' : hasAccess ? 'BUKA' : 'BELI'}
                                    </span>
                                </button>
                            </div>

                            {/* Description - Accordion Reveal (Below Price) */}
                            <div className={`grid transition-all duration-300 ease-out grid-rows-[0fr] opacity-50 group-hover:grid-rows-[1fr] group-hover:opacity-100 ${isFocused ? 'grid-rows-[1fr] opacity-100' : ''}`}>
                                <div className="overflow-hidden">
                                    <p className="text-[9px] text-zinc-400 leading-relaxed font-medium line-clamp-3 mb-1 border-t border-white/10 pt-1">
                                        {tool.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Loading Overlay */}
                {status && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 rounded-[10px]">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-white text-[10px] font-bold tracking-widest">{status}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Checkout Popup */}
            <CheckoutPopup
                tool={tool}
                isOpen={showCheckoutPopup}
                onClose={() => setShowCheckoutPopup(false)}
            />

            {showVideoPopup && embedUrl && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                    onClick={() => setShowVideoPopup(false)}
                >
                    <div
                        className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowVideoPopup(false)}
                            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <iframe
                            src={embedUrl}
                            title={`${tool.name} - Preview Video`}
                            className="w-full h-full bg-black"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}

            {/* Extension Warning Popup */}
            <ExtensionWarningPopup
                isOpen={showExtensionWarning}
                onClose={() => setShowExtensionWarning(false)}
                toolName={tool.name}
            />
        </>
    );
};

export default CompactToolCard;
