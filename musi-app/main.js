// Main Application Logic for Musi App
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginSection = document.getElementById('login-section');
    const dashboard = document.getElementById('dashboard');
    const appleLoginBtn = document.getElementById('apple-login');
    const spotifyLoginBtn = document.getElementById('spotify-login');
    const enhancePlaylistBtn = document.getElementById('enhance-playlist');
    const discoverMixBtn = document.getElementById('discover-mix');
    const playlistDisplay = document.getElementById('playlist-display');
    const playlistHistory = document.getElementById('playlist-history');
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-close');
    const modalMessage = document.getElementById('modal-message');
    const serviceName = document.getElementById('service-name');
    const logoutBtn = document.getElementById('logout-btn');

    // Loading state handlers with enhanced feedback
    const setLoading = (button, isLoading) => {
        if (!button) return;

        const loadingState = button.querySelector('.loading-state');
        const buttonText = button.querySelector('span:not(.loading-state)');
        
        button.disabled = isLoading;
        button.setAttribute('aria-busy', isLoading);
        
        if (isLoading) {
            loadingState?.classList.remove('hidden');
            button.classList.add('opacity-75', 'cursor-not-allowed');
            buttonText?.classList.add('opacity-75');
        } else {
            loadingState?.classList.add('hidden');
            button.classList.remove('opacity-75', 'cursor-not-allowed');
            buttonText?.classList.remove('opacity-75');
        }
    };

    // Enhanced modal handler with animation and type-based styling
    window.showModal = (message, type = CONFIG.UI.MODAL_TYPES.ERROR) => {
        modalMessage.textContent = message;
        modal.classList.remove('hidden');
        
        // Add animation and styling based on type
        const modalContent = modal.querySelector('div');
        modalContent.className = `bg-white rounded-lg p-8 max-w-md w-full mx-4 transform transition-all duration-300 ${
            type === CONFIG.UI.MODAL_TYPES.ERROR 
                ? 'border-l-4 border-red-500' 
                : 'border-l-4 border-green-500'
        }`;
        
        modalContent.classList.add('scale-100');
        modalContent.classList.remove('scale-95');

        // Auto-hide for success messages
        if (type === CONFIG.UI.MODAL_TYPES.SUCCESS) {
            setTimeout(() => {
                hideModal();
            }, CONFIG.UI.LOADING_TIMEOUT);
        }
    };

    const hideModal = () => {
        const modalContent = modal.querySelector('div');
        modalContent.classList.add('scale-95');
        modalContent.classList.remove('scale-100');
        
        setTimeout(() => {
            modal.classList.add('hidden');
        }, CONFIG.ANIMATION_DURATION);
    };

    // Enhanced playlist display methods
    const createTrackCard = (track, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105';
        card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="relative group">
                <img src="${track.imageUrl || CONFIG.UI.DEFAULT_PROFILE_IMAGE}" 
                     alt="${track.name}" 
                     class="w-full h-40 object-cover rounded-md mb-3">
                ${track.previewUrl ? `
                    <button class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md">
                        <i class="fas fa-play text-white text-3xl"></i>
                    </button>
                ` : ''}
            </div>
            <div class="space-y-1">
                <h3 class="text-lg font-semibold text-white mb-1 truncate" title="${track.name}">${track.name}</h3>
                <p class="text-gray-300 text-sm truncate" title="${track.artist}">${track.artist}</p>
                <p class="text-gray-400 text-sm truncate" title="${track.album}">${track.album}</p>
                ${track.confidence ? `
                    <div class="mt-2 space-y-2">
                        <div class="flex items-center">
                            <div class="text-xs text-gray-400 mr-2">Match Score:</div>
                            <div class="flex-1 bg-gray-700 rounded-full h-1">
                                <div class="bg-gradient-to-r ${CONFIG.UI.COLORS.PRIMARY} h-1 rounded-full transition-all duration-500" 
                                     style="width: ${track.confidence}%"></div>
                            </div>
                        </div>
                        ${track.reasons?.map(reason => `
                            <p class="text-xs text-gray-400 italic">${reason}</p>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Add preview functionality if available
        if (track.previewUrl) {
            const previewBtn = card.querySelector('button');
            previewBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(track.previewUrl, '_blank');
            });
        }

        return card;
    };

    const displayRecommendations = (playlist) => {
        if (!playlist?.tracks?.length) {
            showModal('No tracks available in the playlist', CONFIG.UI.MODAL_TYPES.ERROR);
            return;
        }

        playlistDisplay.innerHTML = '';
        
        // Add recommendations header
        const header = document.createElement('div');
        header.className = 'mb-8 text-center';
        header.innerHTML = `
            <h2 class="text-2xl font-bold text-white mb-2">${playlist.name}</h2>
            <p class="text-gray-300 mb-6">AI-powered suggestions based on your music taste</p>
            <div class="flex justify-center space-x-4 mb-8">
                <button id="save-to-service" class="px-6 py-2 bg-gradient-to-r ${CONFIG.UI.COLORS.PRIMARY} rounded-full text-sm font-medium hover:opacity-90 transition-all duration-300 transform hover:scale-105">
                    Save to ${auth.getCurrentService() === 'spotify' ? 'Spotify' : 'Apple Music'}
                </button>
                <button id="export-playlist" class="px-6 py-2 bg-white bg-opacity-10 rounded-full text-sm font-medium hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
                    Export Playlist
                </button>
            </div>
        `;
        playlistDisplay.appendChild(header);

        // Create grid for tracks
        const grid = document.createElement('div');
        grid.className = 'playlist-grid';
        
        playlist.tracks.forEach((track, index) => {
            grid.appendChild(createTrackCard(track, index));
        });
        
        playlistDisplay.appendChild(grid);

        // Add event listeners for save and export buttons
        document.getElementById('save-to-service')?.addEventListener('click', async () => {
            try {
                const saveBtn = document.getElementById('save-to-service');
                setLoading(saveBtn, true);
                await apiService.createServicePlaylist(playlist, auth.getCurrentService());
                showModal('Playlist saved successfully!', CONFIG.UI.MODAL_TYPES.SUCCESS);
            } catch (error) {
                console.error('Failed to save playlist:', error);
                showModal('Failed to save playlist to your music service', CONFIG.UI.MODAL_TYPES.ERROR);
            } finally {
                setLoading(document.getElementById('save-to-service'), false);
            }
        });

        document.getElementById('export-playlist')?.addEventListener('click', () => {
            apiService.exportPlaylist(playlist, 'json');
        });
    };

    const displayPlaylistHistory = () => {
        if (!playlistHistory) return;

        const playlists = apiService.getSavedPlaylists();
        playlistHistory.innerHTML = `
            <h3 class="text-xl font-semibold text-white mb-4">History</h3>
            ${playlists.length === 0 
                ? '<p class="text-gray-400">No saved playlists yet.</p>'
                : '<div class="space-y-4" id="history-list"></div>'
            }
        `;

        const historyList = document.getElementById('history-list');
        if (historyList) {
            playlists.forEach(playlist => {
                const item = document.createElement('div');
                item.className = 'bg-white bg-opacity-10 p-4 rounded-lg hover:bg-opacity-20 transition-all duration-300';
                item.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-white font-semibold truncate">${playlist.name}</h4>
                            <p class="text-gray-400 text-sm">${new Date(playlist.createdAt).toLocaleDateString()}</p>
                            <p class="text-gray-400 text-sm">${playlist.tracks.length} tracks</p>
                        </div>
                        <button data-playlist-id="${playlist.id}" class="export-playlist-btn px-4 py-2 bg-white bg-opacity-10 rounded-full text-xs hover:bg-opacity-20 transition-all duration-300">
                            Export
                        </button>
                    </div>
                `;
                historyList.appendChild(item);
            });

            // Add export button listeners
            historyList.querySelectorAll('.export-playlist-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const playlistId = btn.dataset.playlistId;
                    const playlist = playlists.find(p => p.id.toString() === playlistId);
                    if (playlist) {
                        apiService.exportPlaylist(playlist, 'json');
                    }
                });
            });
        }
    };

    // Event Handlers
    appleLoginBtn?.addEventListener('click', async () => {
        try {
            setLoading(appleLoginBtn, true);
            await auth.loginWithAppleMusic();
        } catch (error) {
            console.error('Apple Music login failed:', error);
            showModal('Failed to connect to Apple Music. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
        } finally {
            setLoading(appleLoginBtn, false);
        }
    });

    spotifyLoginBtn?.addEventListener('click', async () => {
        try {
            setLoading(spotifyLoginBtn, true);
            await auth.loginWithSpotify();
        } catch (error) {
            console.error('Spotify login failed:', error);
            showModal('Failed to connect to Spotify. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
        } finally {
            setLoading(spotifyLoginBtn, false);
        }
    });

    enhancePlaylistBtn?.addEventListener('click', async () => {
        try {
            setLoading(enhancePlaylistBtn, true);
            playlistDisplay.innerHTML = `
                <div class="text-center py-12">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p class="text-gray-300">Analyzing your music preferences...</p>
                </div>
            `;
            
            const preferences = await apiService.getUserPreferences();
            const enhancedPlaylist = await aiPlaylistGenerator.generateEnhancements(preferences);
            
            // Save to history and display
            await apiService.saveGeneratedPlaylist(enhancedPlaylist);
            displayRecommendations(enhancedPlaylist);
            displayPlaylistHistory();
            
            showModal('Here are your enhanced playlist suggestions!', CONFIG.UI.MODAL_TYPES.SUCCESS);
        } catch (error) {
            console.error('Failed to enhance playlist:', error);
            showModal(error.message || 'Failed to generate enhancements. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
        } finally {
            setLoading(enhancePlaylistBtn, false);
        }
    });

    discoverMixBtn?.addEventListener('click', async () => {
        try {
            setLoading(discoverMixBtn, true);
            playlistDisplay.innerHTML = `
                <div class="text-center py-12">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p class="text-gray-300">Creating your personalized discovery mix...</p>
                </div>
            `;
            
            const preferences = await apiService.getUserPreferences();
            const discoveryPlaylist = await aiPlaylistGenerator.generateDiscoveryMix(preferences);
            
            // Save to history and display
            await apiService.saveGeneratedPlaylist(discoveryPlaylist);
            displayRecommendations(discoveryPlaylist);
            displayPlaylistHistory();
            
            showModal('Your personalized discovery mix is ready!', CONFIG.UI.MODAL_TYPES.SUCCESS);
        } catch (error) {
            console.error('Failed to generate discovery mix:', error);
            showModal(error.message || 'Failed to create discovery mix. Please try again.', CONFIG.UI.MODAL_TYPES.ERROR);
        } finally {
            setLoading(discoverMixBtn, false);
        }
    });

    logoutBtn?.addEventListener('click', () => {
        auth.logout();
        window.location.reload();
    });

    modalClose?.addEventListener('click', hideModal);

    // Add keyframe animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Initialize the app
    const initializeApp = async () => {
        try {
            const isAuthenticated = await auth.initializeAuth();
            
            if (isAuthenticated) {
                loginSection?.classList.add('hidden');
                dashboard?.classList.remove('hidden');
                
                const user = auth.getCurrentUser();
                if (user) {
                    const userNameElement = document.getElementById('user-name');
                    const userPicElement = document.getElementById('user-pic');
                    
                    if (userNameElement) userNameElement.textContent = user.name;
                    if (userPicElement) userPicElement.src = user.image;
                    if (serviceName) serviceName.textContent = user.service === 'spotify' ? 'Spotify' : 'Apple Music';
                }

                // Display playlist history
                displayPlaylistHistory();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            showModal('Failed to initialize the application. Please refresh the page.', CONFIG.UI.MODAL_TYPES.ERROR);
        }
    };

    // Handle user logout event
    window.addEventListener('userLoggedOut', () => {
        loginSection?.classList.remove('hidden');
        dashboard?.classList.add('hidden');
        if (playlistDisplay) playlistDisplay.innerHTML = '';
        if (playlistHistory) playlistHistory.innerHTML = '';
    });

    // Start the app
    initializeApp();
});
