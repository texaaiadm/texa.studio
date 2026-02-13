// Popup Script - Check Login Status & Token Vault with Smart Connection
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('container');

  // Get user data from storage
  const data = await chrome.storage.local.get(['texa_user', 'texa_token']);

  if (!data.texa_user || !data.texa_token) {
    // BELUM LOGIN - Tampilkan Warning
    container.innerHTML = `
      <div class="warning">
        <h3>⚠️ BELUM LOGIN</h3>
        <p>Anda belum login ke TEXA Dashboard.</p>
        <p>Silakan login terlebih dahulu.</p>
      </div>
      <button id="btnLogin">Login Sekarang</button>
    `;

    document.getElementById('btnLogin').addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://texa.studio/#/login'
      });
    });
  } else {
    // SUDAH LOGIN - Tampilkan Info User
    const user = data.texa_user;
    const role = user.role || 'MEMBER';
    const email = user.email || 'No email';
    const name = user.name || 'User';

    container.innerHTML = `
      <div class="info">
        <h3>✅ Sudah Login</h3>
        <p><strong>Nama:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <div class="role">Role: ${role}</div>
      </div>
      <button id="btnDashboard">Buka Dashboard</button>
      
      <div class="token-vault" id="tokenVault">
        <h3>🔐 Token Vault</h3>
        <div id="connectionStatus" class="connection-status">
          <div class="status-indicator checking">Checking connection...</div>
        </div>
        <div id="tokenDisplay" style="display:none;">
          <div class="token-preview"></div>
          <div class="token-time"></div>
        </div>
      </div>
    `;

    document.getElementById('btnDashboard').addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://texa.studio/#/'
      });
    });

    // Auto-capture on popup open
    await performAutoCapture();
  }
});

/**
 * Perform automatic token capture and update UI accordingly
 */
async function performAutoCapture() {
  const statusDiv = document.getElementById('connectionStatus');
  const tokenDisplayDiv = document.getElementById('tokenDisplay');

  // Show checking status
  statusDiv.innerHTML = '<div class="status-indicator checking">Checking connection...</div>';

  // Send auto-capture request to background
  chrome.runtime.sendMessage({ action: 'autoCapture' }, async (response) => {
    if (response && response.success) {
      // SUCCESS - Token captured
      console.log('[Popup] Auto-capture successful');

      // Show online status
      statusDiv.innerHTML = '<div class="status-indicator online">Server Online ✓</div>';

      // Token details hidden for security - only show status

    } else {
      // FAILED - Not logged in to Google Labs or error
      console.log('[Popup] Auto-capture failed:', response?.error);

      // Show offline status with Connect button
      statusDiv.innerHTML = `
                <div class="status-indicator offline">Not Connected</div>
                <p style="font-size: 12px; color: #888; margin: 5px 0;">
                    Please login to Google Labs to capture token
                </p>
                <button class="btn-connect" id="btnConnect">
                    🔗 Connect
                </button>
            `;

      // Add click handler for Connect button
      document.getElementById('btnConnect').addEventListener('click', () => {
        console.log('[Popup] Opening Google Labs in background tab...');

        // Update status to show connecting
        statusDiv.innerHTML = `
                    <div class="status-indicator checking">Connecting...</div>
                    <p style="font-size: 12px; color: #888;">
                        Opening Google Labs in background...
                    </p>
                `;

        // Open Google Labs in background tab (silent)
        chrome.tabs.create({
          url: 'https://labs.google/fx/tools/flow',
          active: false // Open in background, tidak mengganggu user
        }, (tab) => {
          console.log('[Popup] Background tab opened:', tab.id);

          // Listen for tab updates to detect when login completes
          const updateListener = (tabId, changeInfo, updatedTab) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              console.log('[Popup] Tab loaded, auto-clicking "Create with Flow" button...');

              // Remove listener
              chrome.tabs.onUpdated.removeListener(updateListener);

              // Inject script to auto-click "Create with Flow" button
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  // Helper function to find element by text content
                  const findButtonByText = (text) => {
                    const buttons = document.querySelectorAll('button');
                    for (const button of buttons) {
                      if (button.textContent.includes(text)) {
                        return button;
                      }
                    }
                    return null;
                  };

                  // Try to find the button
                  let button = null;

                  // Try primary selector
                  try {
                    const span = document.querySelector('div.sc-c7ee1759-1 button > span');
                    if (span) {
                      button = span.closest('button');
                    }
                  } catch (e) { }

                  // Fallback: Find by text
                  if (!button) {
                    button = findButtonByText('Create with Flow');
                  }

                  if (button) {
                    console.log('[Auto-Click] Found button, clicking...');
                    button.click();
                    return { success: true, message: 'Button clicked' };
                  } else {
                    console.warn('[Auto-Click] Button not found');
                    return { success: false, message: 'Button not found' };
                  }
                }
              }, (results) => {
                if (results && results[0]) {
                  console.log('[Popup] Auto-click result:', results[0].result);
                }

                // Wait 3 seconds for OAuth to complete, then retry capture
                setTimeout(() => {
                  console.log('[Popup] Retrying auto-capture after auto-click...');
                  performAutoCapture();

                  // Close the background tab after capture attempt
                  chrome.tabs.remove(tab.id, () => {
                    console.log('[Popup] Background tab closed');
                  });
                }, 3000);
              });
            }
          };

          chrome.tabs.onUpdated.addListener(updateListener);
        });
      });
    }
  });
}


/**
 * Format token for display (preview only)
 * Note: Token details are now hidden for security
 */
