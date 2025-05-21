// Authentication Service for Musi App
const auth = (() => {
    // Private variables to store auth state
    let currentUser = null;
    let currentService = null;

    // Private methods for secure token handling
    const generateRandomString = (length) => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from(crypto.getRandomValues(new Uint8Array(length)))
            .map(x => possible[x % possible.length])
            .join('');
    };

    const generateCodeVerifier = () => {
        return generateRandomString(128);
    };

    const generateCodeChallenge = async (verifier) => {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return btoa(String.fromCharCode(...new Uint8Array(digest)))
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
        } catch (error) {
            console.error('Failed to generate code challenge:', error);
            throw new Error('Security initialization failed');
        }
    };

    const storeAuthState = (service, state, codeVerifier) => {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_STATE, state);
            localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SERVICE, service);
        } catch (error) {
            console.error('Failed to store auth state:', error);
            throw new Error('Failed to initialize authentication');
        }
    };

    const clearAuthState = () => {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_STATE);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SERVICE);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
        } catch (error) {
            console.error('Failed to clear auth state:', error);
        }
    };

    // Public methods
    const loginWithAppleMusic = async () => {
        try {
            const state = generateRandomString(16);
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            
            // Store PKCE values and service
            storeAuthState('apple', state, codeVerifier);
            
            // Construct Apple Music auth URL using the correct authorization endpoint
            const authUrl = new URL('https://appleid.apple.com/auth/authorize');
            authUrl.searchParams.append('client_id', CONFIG.APPLE_MUSIC.CLIENT_ID);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('redirect_uri', CONFIG.APPLE_MUSIC.REDIRECT_URI);
            authUrl.searchParams.append('state', state);
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            authUrl.searchParams.append('scope', CONFIG.APPLE_MUSIC.SCOPES.join(' '));
            authUrl.searchParams.append('response_mode', 'form_post');

            // Redirect to Apple Music auth page
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Apple Music authentication failed:', error);
            showModal('Failed to initialize Apple Music login. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    const loginWithSpotify = async () => {
        try {
            const state = generateRandomString(16);
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            
            // Store PKCE values and service
            storeAuthState('spotify', state, codeVerifier);
            
            // Construct Spotify auth URL
            const authUrl = new URL('https://accounts.spotify.com/authorize');
            authUrl.searchParams.append('client_id', CONFIG.SPOTIFY.CLIENT_ID);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('redirect_uri', CONFIG.SPOTIFY.REDIRECT_URI);
            authUrl.searchParams.append('state', state);
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            authUrl.searchParams.append('scope', CONFIG.SPOTIFY.SCOPES.join(' '));

            // Redirect to Spotify auth page
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Spotify authentication failed:', error);
            showModal('Failed to initialize Spotify login. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    const handleAuthCallback = async () => {
        try {
            const currentService = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_SERVICE);
            const storedState = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_STATE);
            const codeVerifier = localStorage.getItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER);
            
            let code, state;
            
            // Handle different response modes for Apple Music and Spotify
            if (currentService === 'apple') {
                // For Apple Music's form_post response
                const formData = new FormData(document.querySelector('form'));
                code = formData.get('code');
                state = formData.get('state');
            } else {
                // For Spotify's query parameter response
                const urlParams = new URLSearchParams(window.location.search);
                code = urlParams.get('code');
                state = urlParams.get('state');
            }

            if (!state || state !== storedState) {
                throw new Error('Invalid state parameter. Please try logging in again.');
            }

            if (!code || !codeVerifier) {
                throw new Error('Missing authentication parameters. Please try logging in again.');
            }

            // Clear stored PKCE values
            clearAuthState();

            // Determine which service we're authenticating with and use correct token endpoints
            const isSpotify = currentService === 'spotify';
            const tokenEndpoint = isSpotify 
                ? 'https://accounts.spotify.com/api/token'
                : 'https://appleid.apple.com/auth/token';
            const clientId = isSpotify ? CONFIG.SPOTIFY.CLIENT_ID : CONFIG.APPLE_MUSIC.CLIENT_ID;
            const redirectUri = isSpotify ? CONFIG.SPOTIFY.REDIRECT_URI : CONFIG.APPLE_MUSIC.REDIRECT_URI;

            // Exchange code for tokens
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    code_verifier: codeVerifier,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error_description || 'Token exchange failed');
            }

            const data = await response.json();
            
            // Store tokens securely
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, data.access_token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SERVICE, currentService);
            
            // Fetch user profile
            await fetchUserProfile(data.access_token, currentService);
            
            return true;
        } catch (error) {
            console.error('Auth callback failed:', error);
            showModal(error.message || 'Authentication failed. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
            return false;
        }
    };

    const fetchUserProfile = async (token, service) => {
        try {
            const endpoint = service === 'spotify' 
                ? `${CONFIG.SPOTIFY.API_URL}/me`
                : `${CONFIG.APPLE_MUSIC.API_URL}/me`;
            
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const profile = await response.json();
            currentUser = {
                id: profile.id,
                name: profile.display_name || profile.name,
                image: profile.images?.[0]?.url || CONFIG.UI.DEFAULT_PROFILE_IMAGE,
                service
            };

            return currentUser;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            showModal('Failed to load user profile. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    const logout = () => {
        clearAuthState();
        currentUser = null;
        currentService = null;
        
        // Notify the application of logout
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    };

    const getCurrentUser = () => currentUser;
    const getCurrentService = () => localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_SERVICE);
    const isAuthenticated = () => {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
        return !!token && !!getCurrentService();
    };

    // Initialize authentication state
    const initializeAuth = async () => {
        if (window.location.pathname.includes('callback')) {
            return handleAuthCallback();
        } 
        
        if (isAuthenticated()) {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
            const service = getCurrentService();
            if (token && service) {
                try {
                    await fetchUserProfile(token, service);
                    return true;
                } catch (error) {
                    logout();
                    return false;
                }
            }
        }
        return false;
    };

    // Public API
    return {
        loginWithAppleMusic,
        loginWithSpotify,
        logout,
        getCurrentUser,
        getCurrentService,
        isAuthenticated,
        initializeAuth
    };
})();
