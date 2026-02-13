
import React, { useState, useEffect } from 'react';
import { AITool } from '../types';
import { getSession } from '../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';
import { isUrlIframeAllowed, isUrlImageAllowed } from '../utils/iframePolicy';
import {
  subscribeToSettings,
  SubscriptionSettings,
  formatIDR,
  DEFAULT_SETTINGS
} from '../services/supabaseSubscriptionService';
import { checkExtensionInstalled } from '../services/extensionService';
import { usePopupState } from '../services/popupContext';
import ExtensionWarningPopup from './ExtensionWarningPopup';
import CheckoutPopup from './CheckoutPopup';
import { pushRecentOpenedTool } from '../utils/recentTools';

interface ToolCardProps {
  tool: AITool;
  hasAccess: boolean;
  onBuyClick?: () => void;
}

// Parse various YouTube URL formats and convert to embed URL
const parseYouTubeUrl = (url: string): string | null => {
  if (!url) return null;

  try {
    let videoId: string | null = null;

    // Pattern 1: youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }

    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }

    // Pattern 3: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }

    // Pattern 4: youtube.com/embed/VIDEO_ID (already embed)
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }

    // Pattern 5: youtube.com/v/VIDEO_ID
    const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]+)/);
    if (vMatch) {
      videoId = vMatch[1];
    }

    if (videoId) {
      // Remove any query params from video ID
      videoId = videoId.split('?')[0].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    return null;
  } catch {
    return null;
  }
};

const ToolCard: React.FC<ToolCardProps> = ({ tool, hasAccess, onBuyClick }) => {
  const navigate = useNavigate();
  const [injecting, setInjecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [showExtensionWarning, setShowExtensionWarning] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [settings, setSettings] = useState<SubscriptionSettings>(DEFAULT_SETTINGS);

  // Get embed URL from video URL
  const embedUrl = parseYouTubeUrl(tool.embedVideoUrl || '');

  // Register popup states to hide/show header/footer
  usePopupState(showCheckoutPopup || showVideoPopup || showExtensionWarning);

  // Calculate safe image URL at component level (for render access)
  const safeImageUrl = !imageFailed && isUrlImageAllowed(tool.imageUrl || '') ? tool.imageUrl : '';

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

    console.log('🔧 tryOpenViaExtension: Starting...', { toolId: tool.id, targetUrl: tool.targetUrl, hasToken: !!idToken });

    if (window.TEXAExtension && window.TEXAExtension.ready) {
      try {
        console.log('🔧 Using TEXAExtension global object');
        // openTool now returns a Promise
        const result = await window.TEXAExtension.openTool(tool.id, tool.targetUrl, tool.apiUrl, tool.cookiesData || null, idToken);
        return result !== false; // Returns true if opened successfully
      } catch (error) {
        console.error('Extension open tool failed:', error);
        return false;
      }
    }

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log('🔧 Using postMessage with requestId:', requestId);

    return await new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        console.log('⚠️ tryOpenViaExtension: Timeout reached (3s)');
        window.removeEventListener('message', onAck);
        resolve(false);
      }, 3000); // Increased from 800ms to 3000ms for network latency

      const onAck = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = (event.data || {}) as any;
        if (data.type !== 'TEXA_OPEN_TOOL_ACK') return;
        if (data.requestId !== requestId) return;

        console.log('✅ tryOpenViaExtension: ACK received', data);
        window.clearTimeout(timeoutId);
        window.removeEventListener('message', onAck);
        resolve(Boolean(data.ok));
      };

      window.addEventListener('message', onAck);
      console.log('🔧 Posting message to extension...');
      window.postMessage(
        {
          type: 'TEXA_OPEN_TOOL',
          requestId,
          toolId: tool.id,
          idToken,
          targetUrl: tool.targetUrl,
          cookiesData: tool.cookiesData || null,
          apiUrl: tool.apiUrl || null
        },
        window.location.origin
      );
    });
  };

  const handleOpenTool = async () => {
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

    // Check if extension is installed first
    setInjecting(true);
    setStatus("Memeriksa Extension...");

    const isExtensionInstalled = await checkExtensionInstalled();

    if (!isExtensionInstalled) {
      // Extension not installed, show warning popup
      setInjecting(false);
      setStatus(null);
      setShowExtensionWarning(true);
      return;
    }

    // Extension is installed, proceed immediately (no delay!)
    setStatus("Membuka Tool...");

    try {
      const openedByExtension = await tryOpenViaExtension();

      if (openedByExtension) {
        setStatus("Berhasil!");
      } else {
        // Extension failed, fallback to direct open
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
      }, 1000); // Reduced from 2000ms
    }
  };

  return (
    <>
      {/* Parallax Depth ToolCard Structure */}
      <div
        className={`group relative h-full flex flex-col perspective-1000 cursor-pointer ${isFocused ? 'focused' : ''}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          e.currentTarget.style.setProperty('--mouse-x', `${x / rect.width}`);
          e.currentTarget.style.setProperty('--mouse-y', `${y / rect.height}`);
          e.currentTarget.style.setProperty('--rotate-y', `${(x / rect.width) * 15}deg`);
          e.currentTarget.style.setProperty('--rotate-x', `${(y / rect.height) * -15}deg`);
          e.currentTarget.style.setProperty('--bg-x', `${(x / rect.width) * -30}px`);
          e.currentTarget.style.setProperty('--bg-y', `${(y / rect.height) * -30}px`);
        }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          const x = touch.clientX - rect.left - rect.width / 2;
          const y = touch.clientY - rect.top - rect.height / 2;
          e.currentTarget.style.setProperty('--mouse-x', `${x / rect.width}`);
          e.currentTarget.style.setProperty('--mouse-y', `${y / rect.height}`);
          e.currentTarget.style.setProperty('--rotate-y', `${(x / rect.width) * 15}deg`);
          e.currentTarget.style.setProperty('--rotate-x', `${(y / rect.height) * -15}deg`);
          e.currentTarget.style.setProperty('--bg-x', `${(x / rect.width) * -30}px`);
          e.currentTarget.style.setProperty('--bg-y', `${(y / rect.height) * -30}px`);
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
            .perspective-1000 { perspective: 1000px; }
            .parallax-card-lg {
                transform-style: preserve-3d;
                transform: rotateY(var(--rotate-y, 0deg)) rotateX(var(--rotate-x, 0deg));
                transition: transform 0.1s ease-out, box-shadow 0.3s ease;
                /* Reference Style Normal */
                box-shadow:
                  rgba(0, 0, 0, 0.66) 0 30px 60px 0,
                  inset #0f172a 0 0 0 5px, /* bg-slate-900 matching */
                  inset rgba(255, 255, 255, 0.2) 0 0 0 6px;
            }
            .group:hover .parallax-card-lg, .focused .parallax-card-lg {
                transition: transform 0.1s ease-out;
                /* Reference Style Hover */
                box-shadow:
                  rgba(255, 255, 255, 0.1) 0 0 40px 5px,
                  rgba(255, 255, 255, 0.2) 0 0 0 1px,
                  rgba(0, 0, 0, 0.66) 0 30px 60px 0,
                  inset #0f172a 0 0 0 5px,
                  inset rgba(255, 255, 255, 0.8) 0 0 0 6px;
            }
            .group:not(:hover):not(.focused) .parallax-card-lg {
                transition: transform 1s cubic-bezier(0.445, 0.05, 0.55, 0.95);
            }
            .parallax-bg-lg {
                transform: translateX(var(--bg-x, 0px)) translateY(var(--bg-y, 0px)) scale(1.15);
                transition: transform 0.1s ease-out;
            }
            .group:not(:hover):not(.focused) .parallax-bg-lg {
                 transition: transform 1s cubic-bezier(0.445, 0.05, 0.55, 0.95);
            }
          `}
        </style>

        {/* Inner Card - Fixed Height Container with Reference Frame */}
        <div className="parallax-card-lg relative w-full h-[450px] md:h-[500px] rounded-[10px] overflow-hidden bg-slate-900">

          {/* Top: Square Image Area (1:1) - Adjusted to cover top area properly */}
          <div className="absolute top-0 left-0 right-0 h-[70%] z-0 overflow-hidden rounded-[10px]">
            {safeImageUrl ? (
              <img
                src={safeImageUrl}
                alt={tool.name}
                className="parallax-bg-lg w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                loading="lazy"
                onError={() => setImageFailed(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="parallax-bg-lg w-full h-full bg-slate-800 flex items-center justify-center">
                <span className="text-slate-500 font-black uppercase tracking-widest text-sm">{tool.category || 'AI TOOL'}</span>
              </div>
            )}

            {/* Gradient Overlay for Depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />

            {/* Badges */}
            <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-indigo-600/90 backdrop-blur-md rounded-full text-[10px] md:text-xs font-black text-white uppercase tracking-widest shadow-xl border border-white/10">
              {tool.category}
            </div>

            {embedUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVideoPopup(true);
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              >
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105 shadow-2xl">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </button>
            )}
          </div>


          {/* Bottom: Content Area (Absolute Bottom, Slides Up) */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/30 backdrop-blur-md p-5 md:p-6 flex flex-col border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out max-h-[85%] rounded-b-[10px]">
            <div className="mb-2">
              <h3 className="text-lg md:text-2xl font-black text-white leading-tight mb-2 title-glow tracking-tight line-clamp-2">
                {tool.name}
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-start">
                {(() => {
                  const toolAny = tool as any;
                  const price7 = toolAny.price7Days ?? toolAny.price_7_days ?? 0;
                  const priceMonthly = tool.priceMonthly ?? 0;
                  const price = price7 > 0 ? price7 : priceMonthly > 0 ? priceMonthly : (settings.defaultToolPrice || 15000);
                  const duration = price7 > 0 ? 7 : 30;
                  const discount = tool.individualDiscount != null && tool.individualDiscount > 0 ? tool.individualDiscount : undefined;

                  return (
                    <div className="price-promo-glow">
                      <span className="text-[9px] text-emerald-200/80 uppercase font-bold tracking-widest mb-0.5">Mulai Dari</span>
                      <div className="flex items-baseline gap-2">
                        {discount ? (
                          <>
                            <span className="text-xl md:text-2xl price-text-bold">{formatIDR(discount)}</span>
                            <span className="text-xs text-zinc-400 line-through decoration-red-500/50">{formatIDR(price)}</span>
                          </>
                        ) : (
                          <span className="text-xl md:text-2xl price-text-bold">{formatIDR(price)}</span>
                        )}
                        <span className="text-[10px] text-emerald-200/60 font-medium">/{duration}hr</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Description - Moves Upwards as height increases */}
              <div className={`grid transition-all duration-500 ease-out grid-rows-[0fr] opacity-50 group-hover:grid-rows-[1fr] group-hover:opacity-100 ${isFocused ? 'grid-rows-[1fr] opacity-100' : ''}`}>
                <div className="overflow-hidden">
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-medium line-clamp-4 mb-3 border-t border-white/10 pt-2 mt-1">
                    {tool.description}
                  </p>
                </div>
              </div>

              <button
                disabled={injecting}
                onClick={handleOpenTool}
                className="glowing-btn w-full py-4 rounded-xl font-black text-xs md:text-sm active:scale-95 flex items-center justify-center gap-2"
                style={{
                  '--glow-color': injecting ? 'hsl(45, 100%, 50%)' : hasAccess ? 'hsl(140, 100%, 60%)' : 'hsl(190, 100%, 50%)'
                } as React.CSSProperties}
              >
                <span className="glowing-txt">
                  {injecting ? (
                    <span className="flex items-center gap-2">Processing...</span>
                  ) : hasAccess ? (
                    <>OPEN TOOLS</>
                  ) : (
                    <>BELI SEKARANG</>
                  )}
                </span>

              </button>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {status && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 rounded-[10px]">
            <div className="text-center p-6">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white text-sm font-bold tracking-widest uppercase">{status}</p>
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

      {/* Video Popup Modal */}
      {showVideoPopup && embedUrl && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowVideoPopup(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowVideoPopup(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video Title */}
            <div className="absolute -top-12 left-0 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900/60 flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase">
                {safeImageUrl ? (
                  <img
                    src={safeImageUrl}
                    alt={tool.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageFailed(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{tool.category?.slice(0, 2) || 'AI'}</span>
                )}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{tool.name}</h3>
                <p className="text-slate-400 text-xs">Preview Video</p>
              </div>
            </div>

            {/* YouTube iframe */}
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

export default ToolCard;
