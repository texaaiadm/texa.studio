// Background Service Worker - Token Scraper with Auto-Capture
console.log('[TEXA Background] Token Scraper service worker started');

// Import Token Vault module
importScripts('tokenVault.js');

chrome.runtime.onInstalled.addListener(() => {
    console.log('[TEXA Background] Token Scraper extension installed/updated');

    // Setup periodic alarm for auto-capture every 1 hour
    chrome.alarms.create('autoCapture', {
        periodInMinutes: 60 // Capture every 1 hour
    });

    console.log('[TEXA Background] Auto-capture alarm set (every 1 hour)');
    setTimeout(() => updateLoginStatus(), 2000);
});

// Listen for alarm triggers (1 hour periodic auto-capture)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoCapture') {
        console.log('[TEXA Background] ⏰ Auto-capture alarm triggered');

        // Automatically capture token
        captureTokenFromGoogleLabs()
            .then(token => {
                console.log('[TEXA Background] ✅ Auto-capture successful');
            })
            .catch(error => {
                console.error('[TEXA Background] ❌ Auto-capture failed:', error.message);
            });
        updateLoginStatus();
    }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureToken') {
        console.log('[Token Scraper] Manual capture token request received');

        // Call async function and handle response
        captureTokenFromGoogleLabs()
            .then(token => {
                console.log('[Token Scraper] ✅ Token captured successfully');
                sendResponse({ success: true, token: token });
            })
            .catch(error => {
                console.error('[Token Scraper] ❌ Capture failed:', error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep message channel open for async response
    }

    if (request.action === 'autoCapture') {
        console.log('[Token Scraper] Auto-capture on popup open');

        // Silently capture in background, don't block popup
        captureTokenFromGoogleLabs()
            .then(token => {
                console.log('[Token Scraper] ✅ Auto-capture on popup open successful');
                // Notify popup of success
                sendResponse({ success: true, token: token });
            })
            .catch(error => {
                console.error('[Token Scraper] Auto-capture on popup open failed:', error.message);
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }

    // Handle openToolWithCookies - fetch cookies from API and inject to target domain
    if (request.action === 'openToolWithCookies') {
        console.log('[TEXA Background] Open tool request received:', {
            toolId: request.toolId,
            targetUrl: request.targetUrl,
            hasApiUrl: !!request.apiUrl
        });

        openToolWithCookies(request)
            .then(result => {
                console.log('[TEXA Background] ✅ Tool opened successfully');
                sendResponse({ success: true, ...result });
            })
            .catch(error => {
                console.error('[TEXA Background] ❌ Failed to open tool:', error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep message channel open for async response
    }
    if (request.action === 'TEXA_GET_LOGIN_STATUS') {
        chrome.storage.local.get(['google_logged_in', 'texa_logged_in', 'login_status_updated_at'], async (r) => {
            const g = typeof r.google_logged_in === 'boolean' ? r.google_logged_in : await isGoogleLoggedIn();
            const t = typeof r.texa_logged_in === 'boolean' ? r.texa_logged_in : await isTexaLoggedIn();
            sendResponse({ success: true, google: g, texa: t, updatedAt: r.login_status_updated_at || null });
        });
        return true;
    }
});

/**
 * Open tool URL with cookie injection
 * @param {Object} request - Request object with toolId, targetUrl, apiUrl, cookiesData
 * @returns {Promise<Object>} Result object
 */
async function openToolWithCookies(request) {
    const { toolId, targetUrl, apiUrl, cookiesData, idToken } = request;

    console.log('[TEXA Background] Processing tool open request...');

    let cookiesInjected = 0;

    // Priority 1: Use direct cookiesData from tool settings
    if (cookiesData) {
        try {
            const cookies = parseCookiesData(cookiesData);
            console.log('[TEXA Background] Using', cookies.length, 'cookies from cookiesData');
            for (const cookie of cookies) {
                try {
                    await setCookie(cookie, targetUrl);
                    cookiesInjected++;
                } catch (e) {
                    console.warn('[TEXA Background] Failed to set cookie from cookiesData:', cookie?.name, e.message);
                }
            }
        } catch (e) {
            console.error('[TEXA Background] Failed to parse cookiesData:', e.message);
        }
    }

    // Priority 2: Fetch cookies from API URL (additional source)
    if (apiUrl) {
        console.log('[TEXA Background] Fetching cookies from API:', apiUrl);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers
            });
            if (response.ok) {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    const apiCookies = extractCookiesFromAPI(data);
                    console.log('[TEXA Background] Got', apiCookies.length, 'cookies from API');
                    for (const cookie of apiCookies) {
                        try {
                            await setCookie(cookie, targetUrl);
                            cookiesInjected++;
                        } catch (e) {
                            console.warn('[TEXA Background] Failed to set cookie from API:', cookie?.name, e.message);
                        }
                    }
                } catch (parseErr) {
                    console.error('[TEXA Background] JSON parse error:', parseErr);
                }
            } else {
                const errorText = await response.text();
                console.warn('[TEXA Background] API request failed:', response.status, errorText.substring(0, 200));
            }
        } catch (error) {
            console.error('[TEXA Background] Error fetching cookies from API:', error);
        }
    }

    // Extract cookies from API response (handles Firestore and common formats)
    function extractCookiesFromAPI(data) {
        try {
            // Firestore document with stringValue containing JSON array
            if (data && data.fields) {
                for (const key in data.fields) {
                    const field = data.fields[key];
                    if (field && typeof field.stringValue === 'string') {
                        try {
                            const parsed = JSON.parse(field.stringValue);
                            if (Array.isArray(parsed)) return parsed;
                            if (parsed && Array.isArray(parsed.cookies)) return parsed.cookies;
                        } catch { }
                    }
                    // Firestore arrayValue of mapValues
                    if (field && field.arrayValue && Array.isArray(field.arrayValue.values)) {
                        const values = field.arrayValue.values;
                        const cookies = values.map(v => {
                            if (v.mapValue && v.mapValue.fields) {
                                const f = v.mapValue.fields;
                                return {
                                    name: f.name?.stringValue,
                                    value: f.value?.stringValue,
                                    domain: f.domain?.stringValue,
                                    path: f.path?.stringValue || '/',
                                    secure: f.secure?.booleanValue,
                                    httpOnly: f.httpOnly?.booleanValue,
                                    sameSite: f.sameSite?.stringValue
                                };
                            }
                            return null;
                        }).filter(Boolean);
                        if (cookies.length > 0) return cookies;
                    }
                }
            }
            // Direct array
            if (Array.isArray(data)) return data;
            // Object with cookies property
            if (data && Array.isArray(data.cookies)) return data.cookies;
            // Object with data array
            if (data && Array.isArray(data.data)) return data.data;
        } catch { }
        return [];
    }

    // Step 3: Open the target URL in a new tab
    console.log('[TEXA Background] Preparing to open/focus target URL:', targetUrl);
    try {
        const targetHost = new URL(targetUrl).hostname;
        const tabs = await chrome.tabs.query({});
        let existing = null;
        for (const t of tabs) {
            try {
                const u = t.url ? new URL(t.url) : null;
                if (u && u.hostname === targetHost) {
                    existing = t;
                    break;
                }
            } catch { }
        }

        if (existing && existing.id) {
            console.log('[TEXA Background] Found existing tab for host, focusing and reloading:', existing.id);
            await chrome.tabs.update(existing.id, { active: true });
            // Also focus the window containing this tab
            if (existing.windowId) {
                await chrome.windows.update(existing.windowId, { focused: true });
            }
            await chrome.tabs.reload(existing.id);
            return {
                tabId: existing.id,
                cookiesInjected: cookiesInjected,
                targetUrl: targetUrl,
                reusedTab: true
            };
        }
    } catch (e) {
        console.log('[TEXA Background] Tab search error:', e.message);
    }
    const tab = await chrome.tabs.create({ url: targetUrl, active: true });

    return {
        tabId: tab.id,
        cookiesInjected: cookiesInjected,
        targetUrl: targetUrl
    };
}

function parseCookiesData(cookiesData) {
    if (!cookiesData) return [];
    try {
        if (Array.isArray(cookiesData)) return cookiesData;
        if (typeof cookiesData === 'string') {
            const parsed = JSON.parse(cookiesData);
            if (Array.isArray(parsed)) return parsed;
            if (parsed.cookies && Array.isArray(parsed.cookies)) return parsed.cookies;
        }
    } catch (e) {
        console.error('[TEXA Background] Failed to parse cookiesData:', e.message);
    }
    return [];
}

function setCookie(c, targetUrl) {
    const urlObj = new URL(targetUrl);
    const domain = c.domain || urlObj.hostname;
    const name = c.name || '';
    const isHostPrefix = typeof name === 'string' && name.startsWith('__Host-');
    const isSecurePrefix = typeof name === 'string' && name.startsWith('__Secure-');
    const domainForUrl = (c.domain || domain).replace(/^\./, '');
    const urlForCookie = c.url || `${urlObj.protocol}//${domainForUrl}${c.path || '/'}`;
    const cookieDetails = {
        url: urlForCookie,
        name: name,
        value: c.value,
        path: isHostPrefix ? '/' : (c.path || '/'),
        secure: isHostPrefix ? true : (isSecurePrefix ? true : (c.secure !== false)),
        httpOnly: c.httpOnly === true
    };
    if (!isHostPrefix && c.domain) cookieDetails.domain = c.domain;
    if (c.expirationDate) cookieDetails.expirationDate = c.expirationDate;
    const s = normalizeSameSite(c.sameSite);
    if (s) cookieDetails.sameSite = s;
    return chrome.cookies.set(cookieDetails);
}

function parseCookiesFromAny(input) {
    try {
        if (Array.isArray(input)) return input;
        if (typeof input === 'string') {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && Array.isArray(parsed.cookies)) return parsed.cookies;
            if (parsed && Array.isArray(parsed.data)) return parsed.data;
            return [];
        }
        if (input && Array.isArray(input.cookies)) return input.cookies;
        if (input && Array.isArray(input.data)) return input.data;
    } catch { }
    return [];
}

function normalizeSameSite(s) {
    if (!s) return undefined;
    const v = String(s).toLowerCase();
    if (v === 'none' || v === 'no_restriction') return 'no_restriction';
    if (v === 'lax') return 'lax';
    if (v === 'strict') return 'strict';
    return undefined;
}

async function isGoogleLoggedIn() {
    try {
        const a = await chrome.cookies.getAll({ url: 'https://google.com' });
        const b = await chrome.cookies.getAll({ url: 'https://accounts.google.com' });
        const names = new Set([...a, ...b].map(c => c.name));
        const markers = ['SID', 'SAPISID', 'APISID', 'HSID', 'SSID', 'LSID'];
        return markers.some(n => names.has(n));
    } catch {
        return false;
    }
}

async function isTexaLoggedIn() {
    return new Promise(resolve => {
        chrome.storage.local.get(['texa_user'], (r) => {
            resolve(!!r.texa_user);
        });
    });
}

async function updateLoginStatus() {
    const google = await isGoogleLoggedIn();
    const texa = await isTexaLoggedIn();
    await chrome.storage.local.set({
        google_logged_in: google,
        texa_logged_in: texa,
        login_status_updated_at: new Date().toISOString()
    });
}
/**
 * Capture token from Google Labs page source
 * @returns {Promise<string>} Captured bearer token
 */
async function captureTokenFromGoogleLabs() {
    try {
        console.log('[Token Scraper] Fetching Google Labs page...');

        // Fetch page source from Google Labs
        const response = await fetch('https://labs.google/fx/tools/flow', {
            credentials: 'include' // Include cookies for authenticated session
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        console.log('[Token Scraper] Page source retrieved, searching for token...');

        // Extract bearer token using regex
        // Pattern matches: ya29.a0 followed by alphanumeric, underscore, or hyphen
        const tokenPattern = /ya29\.a0[A-Za-z0-9_-]{100,}/;
        const match = html.match(tokenPattern);

        if (!match) {
            throw new Error('Bearer token not found in page source. Make sure you are logged in to Google Labs.');
        }

        const token = match[0];
        console.log('[Token Scraper] Token found:', token.substring(0, 30) + '...');

        // Auto-save to Firestore
        console.log('[Token Scraper] Saving token to Firestore...');
        const saved = await saveTokenToDB(token);

        if (!saved) {
            throw new Error('Failed to save token to Firestore');
        }

        console.log('[Token Scraper] ✅ Token saved to Firestore successfully');

        // Also cache in chrome.storage for offline access
        await chrome.storage.local.set({
            google_labs_token: token,
            token_updated_at: new Date().toISOString()
        });

        return token;

    } catch (error) {
        console.error('[Token Scraper] Error during capture:', error);
        throw error;
    }
}

console.log('[TEXA Background] Token Scraper ready - auto-capture every 1 hour + on popup open');
