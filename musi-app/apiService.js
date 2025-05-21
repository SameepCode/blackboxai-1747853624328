// API Service for Musi App
const apiService = (() => {
    // Private helper methods
    const handleResponse = async (response) => {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API request failed with status ${response.status}`);
        }
        return response.json();
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
        if (!token) throw new Error('No authentication token found');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    // Spotify API methods with enhanced error handling
    const getSpotifyUserPreferences = async () => {
        try {
            const [topTracks, recentTracks] = await Promise.all([
                fetch(`${CONFIG.SPOTIFY.API_URL}/me/top/tracks?limit=50&time_range=medium_term`, {
                    headers: getAuthHeaders()
                }).then(handleResponse),
                fetch(`${CONFIG.SPOTIFY.API_URL}/me/player/recently-played?limit=50`, {
                    headers: getAuthHeaders()
                }).then(handleResponse)
            ]);

            return {
                topTracks: topTracks.items.map(track => ({
                    id: track.id,
                    name: track.name,
                    artist: track.artists[0].name,
                    album: track.album.name,
                    imageUrl: track.album.images[0]?.url || CONFIG.UI.DEFAULT_PROFILE_IMAGE,
                    popularity: track.popularity,
                    previewUrl: track.preview_url,
                    genres: track.artists[0].genres || [],
                    uri: track.uri,
                    duration: track.duration_ms,
                    explicit: track.explicit
                })),
                recentTracks: recentTracks.items.map(item => ({
                    id: item.track.id,
                    name: item.track.name,
                    artist: item.track.artists[0].name,
                    album: item.track.album.name,
                    imageUrl: item.track.album.images[0]?.url || CONFIG.UI.DEFAULT_PROFILE_IMAGE,
                    playedAt: item.played_at,
                    popularity: item.track.popularity,
                    previewUrl: item.track.preview_url,
                    uri: item.track.uri,
                    duration: item.track.duration_ms,
                    explicit: item.track.explicit
                }))
            };
        } catch (error) {
            console.error('Failed to fetch Spotify preferences:', error);
            showModal('Failed to fetch your music preferences from Spotify', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    // Apple Music API methods with enhanced error handling
    const getAppleMusicUserPreferences = async () => {
        try {
            const [recentTracks, favorites] = await Promise.all([
                fetch(`${CONFIG.APPLE_MUSIC.API_URL}/me/recent/played/tracks?limit=50`, {
                    headers: getAuthHeaders()
                }).then(handleResponse),
                fetch(`${CONFIG.APPLE_MUSIC.API_URL}/me/library/songs?limit=50`, {
                    headers: getAuthHeaders()
                }).then(handleResponse)
            ]);

            return {
                recentTracks: recentTracks.data.map(track => ({
                    id: track.id,
                    name: track.attributes.name,
                    artist: track.attributes.artistName,
                    album: track.attributes.albumName,
                    imageUrl: track.attributes.artwork?.url || CONFIG.UI.DEFAULT_PROFILE_IMAGE,
                    genres: track.attributes.genreNames,
                    playedAt: track.attributes.playParams?.lastPlayedAt,
                    popularity: track.attributes.popularity || 50,
                    duration: track.attributes.durationInMillis,
                    explicit: track.attributes.contentRating === 'explicit'
                })),
                favorites: favorites.data.map(track => ({
                    id: track.id,
                    name: track.attributes.name,
                    artist: track.attributes.artistName,
                    album: track.attributes.albumName,
                    imageUrl: track.attributes.artwork?.url || CONFIG.UI.DEFAULT_PROFILE_IMAGE,
                    genres: track.attributes.genreNames,
                    popularity: track.attributes.popularity || 50,
                    duration: track.attributes.durationInMillis,
                    explicit: track.attributes.contentRating === 'explicit'
                }))
            };
        } catch (error) {
            console.error('Failed to fetch Apple Music preferences:', error);
            showModal('Failed to fetch your music preferences from Apple Music', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    // Unified method to get user preferences
    const getUserPreferences = async () => {
        const service = auth.getCurrentService();
        if (!service) throw new Error('No music service selected');

        return service === 'spotify' 
            ? getSpotifyUserPreferences()
            : getAppleMusicUserPreferences();
    };

    // Enhanced playlist management methods
    const saveGeneratedPlaylist = async (playlist) => {
        try {
            if (!playlist?.tracks?.length) {
                throw new Error('Invalid playlist data');
            }

            const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYLIST_HISTORY) || '[]');
            
            const newPlaylist = {
                id: Date.now(),
                createdAt: new Date().toISOString(),
                tracks: playlist.tracks,
                service: auth.getCurrentService(),
                name: playlist.name || `Generated Playlist ${new Date().toLocaleDateString()}`,
                type: playlist.type || 'custom'
            };
            
            // Add to beginning of history and maintain limit
            history.unshift(newPlaylist);
            if (history.length > CONFIG.HISTORY_LIMIT) {
                history.pop();
            }
            
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_HISTORY, JSON.stringify(history));
            
            return newPlaylist;
        } catch (error) {
            console.error('Failed to save playlist:', error);
            showModal('Failed to save your generated playlist', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    const getSavedPlaylists = () => {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYLIST_HISTORY) || '[]');
        } catch (error) {
            console.error('Failed to retrieve saved playlists:', error);
            return [];
        }
    };

    const exportPlaylist = async (playlist, format = 'json') => {
        try {
            let content, filename, type;

            if (format === 'json') {
                content = JSON.stringify(playlist, null, 2);
                type = 'application/json';
                filename = `musi-playlist-${Date.now()}.json`;
            } else if (format === 'm3u') {
                content = '#EXTM3U\n' + playlist.tracks
                    .map(track => `#EXTINF:${Math.round(track.duration/1000)},${track.artist} - ${track.name}\n${track.previewUrl || ''}`)
                    .join('\n');
                type = 'audio/x-mpegurl';
                filename = `musi-playlist-${Date.now()}.m3u`;
            } else {
                throw new Error('Unsupported export format');
            }

            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showModal('Playlist exported successfully!', CONFIG.UI.MODAL_TYPES.SUCCESS);
        } catch (error) {
            console.error('Failed to export playlist:', error);
            showModal('Failed to export your playlist', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    // Service-specific playlist creation with enhanced error handling
    const createServicePlaylist = async (playlist, service) => {
        try {
            if (!playlist?.tracks?.length) {
                throw new Error('Invalid playlist data');
            }

            if (service === 'spotify') {
                // Create Spotify playlist
                const response = await fetch(`${CONFIG.SPOTIFY.API_URL}/users/${auth.getCurrentUser().id}/playlists`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        name: playlist.name,
                        description: 'Created by Musi App',
                        public: false
                    })
                }).then(handleResponse);

                if (playlist.tracks.length > 0) {
                    await fetch(`${CONFIG.SPOTIFY.API_URL}/playlists/${response.id}/tracks`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            uris: playlist.tracks.map(track => track.uri)
                        })
                    }).then(handleResponse);
                }

                showModal('Playlist created successfully in Spotify!', CONFIG.UI.MODAL_TYPES.SUCCESS);
                return response;
            } else {
                // Create Apple Music playlist
                const response = await fetch(`${CONFIG.APPLE_MUSIC.API_URL}/me/library/playlists`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        attributes: {
                            name: playlist.name,
                            description: 'Created by Musi App'
                        },
                        relationships: {
                            tracks: {
                                data: playlist.tracks.map(track => ({
                                    id: track.id,
                                    type: 'songs'
                                }))
                            }
                        }
                    })
                }).then(handleResponse);

                showModal('Playlist created successfully in Apple Music!', CONFIG.UI.MODAL_TYPES.SUCCESS);
                return response;
            }
        } catch (error) {
            console.error('Failed to create service playlist:', error);
            showModal('Failed to create playlist in your music service', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    // Public API
    return {
        getUserPreferences,
        saveGeneratedPlaylist,
        getSavedPlaylists,
        exportPlaylist,
        createServicePlaylist
    };
})();
