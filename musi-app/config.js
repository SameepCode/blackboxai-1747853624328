// Configuration for Musi App
const CONFIG = {
    // Apple Music Configuration
    APPLE_MUSIC: {
        API_URL: "https://api.music.apple.com/v1",
        DEVELOPER_TOKEN: "YOUR_DEVELOPER_TOKEN", // Get this from Apple Music developer portal
        CLIENT_ID: "YOUR_CLIENT_ID", // Your Apple Music Services ID from Apple Developer account
        REDIRECT_URI: window.location.origin + "/callback",
        SCOPES: [
            "name",
            "email",
            "music"
        ],
        TEAM_ID: "YOUR_TEAM_ID", // Your Apple Developer Team ID
        KEY_ID: "YOUR_KEY_ID" // Your Music Key ID from Apple Developer account
    },

    // Spotify Configuration
    SPOTIFY: {
        API_URL: "https://api.spotify.com/v1",
        CLIENT_ID: "YOUR_SPOTIFY_CLIENT_ID",
        REDIRECT_URI: window.location.origin + "/callback",
        SCOPES: [
            "user-read-private",
            "user-read-email",
            "user-top-read",
            "playlist-modify-public",
            "playlist-modify-private",
            "user-read-recently-played"
        ]
    },

    // Application Settings
    MAX_PLAYLIST_ITEMS: 20,
    HISTORY_LIMIT: 10,
    ANIMATION_DURATION: 300,
    
    // Storage Keys
    STORAGE_KEYS: {
        USER_TOKEN: "musi_user_token",
        PLAYLIST_HISTORY: "musi_playlist_history",
        USER_PREFERENCES: "musi_user_preferences",
        CURRENT_SERVICE: "musi_current_service",
        AUTH_STATE: "musi_auth_state",
        CODE_VERIFIER: "musi_code_verifier"
    },

    // UI Configuration
    UI: {
        HERO_IMAGE: "https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg",
        LOADING_TIMEOUT: 3000,
        DEFAULT_PROFILE_IMAGE: "https://via.placeholder.com/150",
        MODAL_TYPES: {
            ERROR: "error",
            SUCCESS: "success"
        },
        COLORS: {
            PRIMARY: "from-purple-600 to-pink-600",
            SECONDARY: "from-blue-600 to-purple-600",
            ERROR: "bg-red-500",
            SUCCESS: "bg-green-500"
        }
    },

    // AI Configuration
    AI: {
        CONFIDENCE_THRESHOLD: 70,
        MIN_TRACKS_REQUIRED: 5,
        ANALYSIS_WEIGHTS: {
            GENRE: 0.3,
            ARTIST: 0.2,
            POPULARITY: 0.2,
            RECENCY: 0.2,
            TIME_CONTEXT: 0.1
        }
    }
};

// Prevent modifications to the configuration
Object.freeze(CONFIG);
