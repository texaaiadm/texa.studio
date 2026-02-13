// Token Vault Module - Firestore Integration
// Handles GET/POST operations for Google OAuth tokens

const FIRESTORE_ENDPOINT = "https://firestore.googleapis.com/v1/projects/texa-f4b30/databases/(default)/documents/artifacts/my-token-vault/public/data/tokens/google_oauth_user_1";

/**
 * Fetch token from Firestore Token Vault
 * @returns {Promise<string|null>} Token string or null if not found
 */
async function getTokenFromDB() {
    try {
        const response = await fetch(FIRESTORE_ENDPOINT);

        if (!response.ok) {
            console.warn('[Token Vault] Token not found in database');
            return null;
        }

        const data = await response.json();
        // Parse Firestore structure: { fields: { token: { stringValue: "..." } } }
        const token = data.fields?.token?.stringValue;

        if (token) {
            console.log('[Token Vault] Token retrieved successfully');
            return token;
        } else {
            console.warn('[Token Vault] Token field missing in document');
            return null;
        }
    } catch (error) {
        console.error('[Token Vault] Error fetching token:', error);
        return null;
    }
}

/**
 * Save token to Firestore Token Vault
 * @param {string} newToken - The bearer token to save
 * @returns {Promise<boolean>} True if saved successfully
 */
async function saveTokenToDB(newToken) {
    if (!newToken || typeof newToken !== 'string') {
        console.error('[Token Vault] Invalid token provided');
        return false;
    }

    const body = {
        fields: {
            token: { stringValue: newToken },
            id: { stringValue: "google_oauth_user_1" },
            updatedAt: { timestampValue: new Date().toISOString() },
            note: { stringValue: "Disimpan dari Ekstensi" }
        }
    };

    try {
        const response = await fetch(FIRESTORE_ENDPOINT, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            console.log('[Token Vault] ✅ Token saved successfully');
            return true;
        } else {
            console.error('[Token Vault] Failed to save token:', response.status);
            return false;
        }
    } catch (error) {
        console.error('[Token Vault] Error saving token:', error);
        return false;
    }
}

/**
 * Get token status for display in popup
 * @returns {Promise<Object>} Status object with token info
 */
async function getTokenStatus() {
    try {
        const response = await fetch(FIRESTORE_ENDPOINT);

        if (!response.ok) {
            return {
                exists: false,
                token: null,
                updated: null,
                message: 'No token found in vault'
            };
        }

        const data = await response.json();
        const token = data.fields?.token?.stringValue;
        const updatedAt = data.fields?.updatedAt?.timestampValue;

        if (token) {
            return {
                exists: true,
                token: token,
                updated: updatedAt,
                message: 'Token active'
            };
        } else {
            return {
                exists: false,
                token: null,
                updated: null,
                message: 'Token field missing'
            };
        }
    } catch (error) {
        console.error('[Token Vault] Error getting status:', error);
        return {
            exists: false,
            token: null,
            updated: null,
            message: 'Error fetching token'
        };
    }
}

/**
 * Format token for display (preview only)
 * @param {string} token - Full token string
 * @returns {string} Formatted token preview
 */
function formatTokenPreview(token) {
    if (!token || token.length < 40) {
        return token || 'N/A';
    }

    const start = token.substring(0, 20);
    const end = token.substring(token.length - 20);
    return `${start}...${end}`;
}
