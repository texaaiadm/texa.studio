// Content Script - TEXA Extension v1.3.2
// Robust injection that survives HMR and page updates

console.log('[TEXA] Content script loaded at:', document.readyState);

// =====================================================
// SCRIPT INJECTION - Using external file (bypasses CSP)
// =====================================================

let injectionCount = 0;

function injectScript() {
    // Remove old script tag if exists (prevents duplicates)
    const existing = document.getElementById('texa-injected-script');
    if (existing) {
        existing.remove();
    }

    injectionCount++;
    const script = document.createElement('script');
    script.id = 'texa-injected-script';
    // Add cache-busting parameter to force re-execution
    script.src = chrome.runtime.getURL('injected.js') + '?t=' + Date.now();
    script.onload = function () {
        console.log('[TEXA] injected.js loaded successfully (injection #' + injectionCount + ')');
    };
    script.onerror = function () {
        console.error('[TEXA] Failed to load injected.js');
    };

    const target = document.documentElement || document.head || document.body;
    if (target) {
        target.appendChild(script);
    }
}

// Inject immediately at document_start
injectScript();

// Also inject when DOM is ready (ensures it runs after CSP headers are applied)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[TEXA] DOMContentLoaded - checking injection');
        injectScript();
    });
}

// Listen for Vite HMR which resets the window context
// Vite sends a vite:beforeUpdate event before HMR
window.addEventListener('message', (event) => {
    if (event.data?.type === 'vite:beforeUpdate' || event.data?.type === 'webpackHotUpdate') {
        console.log('[TEXA] HMR detected, will re-inject...');
        // Delay slightly to let HMR complete
        setTimeout(injectScript, 500);
    }
});

// =====================================================
// CONTENT SCRIPT MESSAGE HANDLING
// =====================================================
let syncIntervalId = null;

function isExtensionContextValid() {
    try {
        return chrome.runtime && chrome.runtime.id !== undefined;
    } catch (e) {
        return false;
    }
}

async function syncUserData() {
    if (!isExtensionContextValid()) {
        if (syncIntervalId) {
            clearInterval(syncIntervalId);
            syncIntervalId = null;
        }
        return;
    }

    try {
        const userRaw = localStorage.getItem('texa_current_user');
        const token = localStorage.getItem('texa_id_token');

        if (isExtensionContextValid()) {
            if (userRaw && token) {
                const user = JSON.parse(userRaw);
                await chrome.storage.local.set({ texa_user: user, texa_token: token });
                // console.log('[TEXA] User synced:', user.email);
            } else {
                await chrome.storage.local.remove(['texa_user', 'texa_token']);
                // console.log('[TEXA] No user data');
            }
        } else {
            // Context became invalid during execution
            if (syncIntervalId) {
                clearInterval(syncIntervalId);
                syncIntervalId = null;
            }
        }
    } catch (e) {
        // Catch "Extension context invalidated" specifically
        if (e.message?.includes('Extension context invalidated')) {
            console.warn('[TEXA] Context invalidated, stopping sync');
            if (syncIntervalId) {
                clearInterval(syncIntervalId);
                syncIntervalId = null;
            }
        }
    }
}

// Message handler for tool opening
window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};

    // First check context validity for ANY extension operation
    if (!isExtensionContextValid()) {
        // If it's an OPEN_TOOL request, we must respond to avoid hanging promises
        if (data.type === 'TEXA_OPEN_TOOL' && data.requestId) {
            console.warn('[TEXA CS] Extension context invalidated (reload expected)');
            window.postMessage({
                type: 'TEXA_OPEN_TOOL_ACK',
                requestId: data.requestId,
                ok: false,
                error: 'Extension context invalidated - please reload page'
            }, window.location.origin);
        }
        return;
    }

    if (data.type === 'TEXA_EXTENSION_PING' && data.requestId) {
        try {
            console.log('[TEXA CS] Ping received');
            window.postMessage({
                type: 'TEXA_EXTENSION_PONG',
                requestId: data.requestId,
                installed: true,
                version: '1.3.2'
            }, window.location.origin);
        } catch (e) {
            console.warn('[TEXA CS] Ping failed:', e);
        }
    }

    if (data.type === 'TEXA_OPEN_TOOL' && data.requestId) {
        console.log('[TEXA CS] OPEN_TOOL received:', data.toolId);

        try {
            let idTokenToUse = data.idToken;
            try {
                if (!idTokenToUse) {
                    const s = await chrome.storage.local.get(['texa_token']);
                    if (s && s.texa_token) idTokenToUse = s.texa_token;
                }
            } catch (storageErr) {
                console.warn('[TEXA CS] Token storage access failed:', storageErr);
            }

            const response = await chrome.runtime.sendMessage({
                action: 'openToolWithCookies',
                toolId: data.toolId,
                targetUrl: data.targetUrl,
                idToken: idTokenToUse,
                apiUrl: data.apiUrl,
                cookiesData: data.cookiesData
            });

            console.log('[TEXA CS] Background response:', response);

            window.postMessage({
                type: 'TEXA_OPEN_TOOL_ACK',
                requestId: data.requestId,
                ok: response?.success || false,
                error: response?.error || null
            }, window.location.origin);
        } catch (error) {
            // Handle context invalidation during async operation
            const isInvalid = error.message?.includes('Extension context invalidated');
            console.warn('[TEXA CS] Error:', isInvalid ? 'Context invalidated' : error);

            window.postMessage({
                type: 'TEXA_OPEN_TOOL_ACK',
                requestId: data.requestId,
                ok: false,
                error: isInvalid ? 'Extension context invalidated - please reload page' : error.message
            }, window.location.origin);
        }
    }
});

// Start sync
syncUserData();
syncIntervalId = setInterval(syncUserData, 3000);

window.addEventListener('beforeunload', () => {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
});

console.log('[TEXA] Content script initialized v1.3.2');
