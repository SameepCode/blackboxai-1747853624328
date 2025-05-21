// AI Playlist Generator Service for Musi App
const aiPlaylistGenerator = (() => {
    // Private helper methods
    const analyzePreferences = (preferences) => {
        try {
            const analysis = {
                genres: new Map(),
                artists: new Map(),
                popularity: [],
                recentlyPlayed: new Set(),
                timeOfDay: new Map(),
                tempos: [],
                moods: new Map(),
                explicit: 0,
                totalTracks: 0
            };

            // Process top tracks with weighted analysis
            preferences.topTracks?.forEach(track => {
                analysis.totalTracks++;
                
                // Genre analysis with weighted scoring
                track.genres?.forEach(genre => {
                    const currentWeight = analysis.genres.get(genre) || 0;
                    analysis.genres.set(genre, currentWeight + CONFIG.AI.ANALYSIS_WEIGHTS.GENRE);
                });

                // Artist analysis
                analysis.artists.set(track.artist, (analysis.artists.get(track.artist) || 0) + CONFIG.AI.ANALYSIS_WEIGHTS.ARTIST);

                // Popularity and explicit content analysis
                if (track.popularity) {
                    analysis.popularity.push(track.popularity);
                }
                if (track.explicit) {
                    analysis.explicit++;
                }

                // Mood analysis based on genre keywords and track characteristics
                track.genres?.forEach(genre => {
                    if (genre.includes('happy') || genre.includes('dance')) {
                        analysis.moods.set('upbeat', (analysis.moods.get('upbeat') || 0) + 1);
                    } else if (genre.includes('sad') || genre.includes('ballad')) {
                        analysis.moods.set('melancholic', (analysis.moods.get('melancholic') || 0) + 1);
                    } else if (genre.includes('chill') || genre.includes('ambient')) {
                        analysis.moods.set('relaxed', (analysis.moods.get('relaxed') || 0) + 1);
                    } else if (genre.includes('rock') || genre.includes('metal')) {
                        analysis.moods.set('energetic', (analysis.moods.get('energetic') || 0) + 1);
                    }
                });
            });

            // Process recent tracks with time-based analysis
            preferences.recentTracks?.forEach(track => {
                analysis.totalTracks++;
                analysis.recentlyPlayed.add(track.id);

                if (track.playedAt) {
                    const hour = new Date(track.playedAt).getHours();
                    const timeSlot = Math.floor(hour / 6); // 4 time slots per day
                    analysis.timeOfDay.set(timeSlot, (analysis.timeOfDay.get(timeSlot) || 0) + CONFIG.AI.ANALYSIS_WEIGHTS.TIME_CONTEXT);
                }
            });

            // Validate analysis data
            if (analysis.totalTracks < CONFIG.AI.MIN_TRACKS_REQUIRED) {
                throw new Error('Insufficient track data for analysis');
            }

            return {
                topGenres: Array.from(analysis.genres.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([genre]) => genre),
                
                topArtists: Array.from(analysis.artists.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([artist]) => artist),
                
                averagePopularity: analysis.popularity.length 
                    ? analysis.popularity.reduce((a, b) => a + b, 0) / analysis.popularity.length 
                    : 50,
                
                preferredTimeSlot: Array.from(analysis.timeOfDay.entries())
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 0,
                
                dominantMood: Array.from(analysis.moods.entries())
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral',
                
                explicitPreference: analysis.explicit / analysis.totalTracks > 0.3,
                recentlyPlayed: analysis.recentlyPlayed
            };
        } catch (error) {
            console.error('Failed to analyze preferences:', error);
            throw new Error('Failed to analyze music preferences');
        }
    };

    const calculateMatchScore = (track, preferences) => {
        let score = 0;
        let reasons = [];

        // Genre match (30% weight)
        const genreMatch = track.genres?.some(genre => preferences.topGenres.includes(genre));
        if (genreMatch) {
            const matchedGenre = track.genres.find(genre => preferences.topGenres.includes(genre));
            score += 30;
            reasons.push(`Matches your interest in ${matchedGenre} music`);
        }

        // Artist match but not exact (20% weight)
        const artistSimilarity = preferences.topArtists.includes(track.artist) ? 0.8 : 1;
        score += 20 * artistSimilarity;
        if (artistSimilarity < 1) {
            reasons.push(`Similar to your favorite artist ${track.artist}`);
        }

        // Popularity similarity (20% weight)
        if (track.popularity) {
            const popularityDiff = Math.abs(track.popularity - preferences.averagePopularity);
            const popularityScore = 20 * (1 - popularityDiff / 100);
            score += popularityScore;
            
            if (popularityScore > 15) {
                reasons.push('Matches your preferred popularity level');
            }
        }

        // Novelty bonus (20% weight)
        if (!preferences.recentlyPlayed.has(track.id)) {
            score += 20;
            reasons.push('Fresh content for your playlist');
        }

        // Time context bonus (10% weight)
        const currentHour = new Date().getHours();
        const currentTimeSlot = Math.floor(currentHour / 6);
        if (currentTimeSlot === preferences.preferredTimeSlot) {
            score += 10;
            reasons.push('Fits your usual listening time');
        }

        // Explicit content adjustment
        if (track.explicit && !preferences.explicitPreference) {
            score *= 0.8;
        }

        // Add controlled randomness (±5%)
        const randomness = (Math.random() * 10 - 5);
        score += randomness;

        // Ensure score is between 0 and 100
        score = Math.min(Math.max(Math.round(score), 0), 100);

        return {
            score,
            reasons: reasons.slice(0, 2) // Return top 2 reasons
        };
    };

    const generatePlaylistName = (tracks, analysis) => {
        const timeOfDay = new Date().getHours();
        let prefix = '';
        
        if (timeOfDay >= 5 && timeOfDay < 12) prefix = 'Morning';
        else if (timeOfDay >= 12 && timeOfDay < 17) prefix = 'Afternoon';
        else if (timeOfDay >= 17 && timeOfDay < 21) prefix = 'Evening';
        else prefix = 'Night';

        const mood = analysis.dominantMood.charAt(0).toUpperCase() + analysis.dominantMood.slice(1);
        return `${prefix} ${mood} Mix - ${new Date().toLocaleDateString()}`;
    };

    // Public methods
    const generateEnhancements = async (preferences) => {
        try {
            if (!preferences?.topTracks?.length && !preferences?.recentTracks?.length) {
                throw new Error('Insufficient music preference data');
            }

            const analysis = analyzePreferences(preferences);
            
            // In a real implementation, this would call an AI service
            // For now, we'll simulate AI-generated recommendations
            const allTracks = [
                ...(preferences.topTracks || []),
                ...(preferences.recentTracks?.map(track => track) || [])
            ];

            // Remove duplicates and recently played tracks
            const uniqueTracks = Array.from(
                new Map(allTracks.map(track => [track.id, track]))
                .values()
            ).filter(track => !analysis.recentlyPlayed.has(track.id));

            if (uniqueTracks.length < CONFIG.AI.MIN_TRACKS_REQUIRED) {
                throw new Error('Not enough unique tracks for recommendations');
            }

            // Score and sort tracks
            const scoredTracks = uniqueTracks.map(track => {
                const { score, reasons } = calculateMatchScore(track, analysis);
                return {
                    ...track,
                    confidence: score,
                    reasons
                };
            }).sort((a, b) => b.confidence - a.confidence);

            // Filter tracks with confidence above threshold
            const recommendedTracks = scoredTracks
                .filter(track => track.confidence >= CONFIG.AI.CONFIDENCE_THRESHOLD)
                .slice(0, CONFIG.MAX_PLAYLIST_ITEMS);

            if (recommendedTracks.length === 0) {
                throw new Error('No tracks met the confidence threshold');
            }

            // Create enhanced playlist
            const enhancedPlaylist = {
                name: generatePlaylistName(recommendedTracks, analysis),
                tracks: recommendedTracks,
                createdAt: new Date().toISOString(),
                type: 'enhancement'
            };

            return enhancedPlaylist;
        } catch (error) {
            console.error('Failed to generate enhancements:', error);
            showModal(error.message || 'Failed to generate playlist enhancements', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    const generateDiscoveryMix = async (preferences) => {
        try {
            if (!preferences?.topTracks?.length && !preferences?.recentTracks?.length) {
                throw new Error('Insufficient music preference data');
            }

            const analysis = analyzePreferences(preferences);
            
            // Simulate discovering new tracks based on preferences
            // In a real implementation, this would call an AI service
            const discoveredTracks = [
                ...(preferences.topTracks || []),
                ...(preferences.recentTracks?.map(track => track) || [])
            ].map(track => {
                // Create a "new" track based on existing preferences
                const { score, reasons } = calculateMatchScore(track, analysis);
                return {
                    ...track,
                    id: `discovery_${Math.random().toString(36).substr(2, 9)}`,
                    name: `${track.name} (Discovery Mix)`,
                    confidence: score,
                    reasons
                };
            });

            // Filter and sort discoveries
            const uniqueDiscoveries = Array.from(
                new Map(discoveredTracks.map(track => [track.id, track]))
                .values()
            )
            .sort((a, b) => b.confidence - a.confidence)
            .filter(track => track.confidence >= CONFIG.AI.CONFIDENCE_THRESHOLD)
            .slice(0, CONFIG.MAX_PLAYLIST_ITEMS);

            if (uniqueDiscoveries.length === 0) {
                throw new Error('No suitable tracks found for discovery mix');
            }

            // Create discovery playlist
            const discoveryPlaylist = {
                name: `Discovery Mix - ${new Date().toLocaleDateString()}`,
                tracks: uniqueDiscoveries,
                createdAt: new Date().toISOString(),
                type: 'discovery'
            };

            return discoveryPlaylist;
        } catch (error) {
            console.error('Failed to generate discovery mix:', error);
            showModal(error.message || 'Failed to generate discovery mix', CONFIG.UI.MODAL_TYPES.ERROR);
            throw error;
        }
    };

    // Public API
    return {
        generateEnhancements,
        generateDiscoveryMix
    };
})();
