// Injected Script - Runs in PAGE context (not isolated world)
// This script is injected by content.js to expose TEXAExtension to the page

(function () {
    'use strict';

    console.log('[TEXA Injected] Setting up window.TEXAExtension in page context');

    // Create TEXAExtension object in page's window
    window.TEXAExtension = {
        ready: true,
        version: '1.3.2',

        getStatus: function () {
            return { version: '1.3.2', ready: true, injectedAt: new Date().toISOString() };
        },

        /**
         * Open a tool with cookie injection
         * Communicates with content script via window.postMessage
         */
        openTool: function (toolId, targetUrl, apiUrl, cookiesData, idToken) {
            return new Promise(function (resolve) {
                var requestId = Date.now() + '-' + Math.random().toString(16).slice(2);

                console.log('[TEXA Injected] openTool called:', {
                    toolId: toolId,
                    targetUrl: targetUrl,
                    hasApiUrl: !!apiUrl,
                    hasCookiesData: !!cookiesData
                });

                var timeoutId = setTimeout(function () {
                    window.removeEventListener('message', onAck);
                    console.log('[TEXA Injected] openTool timeout');
                    resolve(false);
                }, 10000);

                function onAck(event) {
                    if (event.origin !== window.location.origin) return;
                    var data = event.data || {};
                    if (data.type !== 'TEXA_OPEN_TOOL_ACK') return;
                    if (data.requestId !== requestId) return;

                    clearTimeout(timeoutId);
                    window.removeEventListener('message', onAck);

                    console.log('[TEXA Injected] openTool ACK received:', data);
                    resolve(Boolean(data.ok));
                }

                window.addEventListener('message', onAck);

                // Send message to content script
                window.postMessage({
                    type: 'TEXA_OPEN_TOOL',
                    requestId: requestId,
                    toolId: toolId,
                    targetUrl: targetUrl,
                    apiUrl: apiUrl,
                    cookiesData: cookiesData,
                    idToken: idToken
                }, window.location.origin);
            });
        }
    };

    // Ping responder (for extension detection from extensionService.ts)
    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) return;
        var data = event.data || {};

        if (data.type === 'TEXA_EXTENSION_PING' && data.requestId) {
            console.log('[TEXA Injected] Responding to ping');
            window.postMessage({
                type: 'TEXA_EXTENSION_PONG',
                requestId: data.requestId,
                installed: true,
                version: '1.3.2'
            }, window.location.origin);
        }

        // Probe responder (for content.js HMR re-injection check)
        if (data.type === 'TEXA_PROBE_PING' && data.probeId) {
            window.postMessage({
                type: 'TEXA_PROBE_PONG',
                probeId: data.probeId
            }, window.location.origin);
        }
    });

    // Dispatch ready event so Navbar can detect it
    window.dispatchEvent(new Event('TEXA_EXTENSION_READY'));

    console.log('[TEXA Injected] window.TEXAExtension is now available:', {
        ready: window.TEXAExtension.ready,
        version: window.TEXAExtension.version,
        hasOpenTool: typeof window.TEXAExtension.openTool === 'function',
        hasGetStatus: typeof window.TEXAExtension.getStatus === 'function'
    });
})();
