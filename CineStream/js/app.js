// ============================================
// CONFIGURACIÓN
// ============================================
const API_KEY = "686e8f50b2135e3c32f670ec018df888"; // ⚠️ REEMPLAZA CON TU API KEY DE TMDB
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";
const TORRENTIO_URL = "https://torrentio.strem.fun";

// ⚠️ IMPORTANTE: Torrentio no permite CORS desde el navegador.
// Opción A: Proxy público (solo para pruebas, inestable)
// Opción B: Tu propio backend (recomendado) - reemplaza la URL por tu endpoint
// Ejemplo: const PROXY_URL = "/api/proxy?url=";
const CORS_PROXY = "https://corsproxy.io/?";
// Formato: CORS_PROXY + encodeURIComponent(url)

// Servidores de video embebido
const VIDEO_SERVERS = {
    "VidSrc PRO": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidsrc.pro/embed/movie/${id}`;
        return `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}`;
    },
    "VidSrc XYZ": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${id}`;
        return `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`;
    },
    "VidSrc ME": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidsrcme.ru/embed/movie/${id}`;
        return `https://vidsrcme.ru/embed/tv/${id}/${season}/${episode}`;
    },
    "Embed SU": (type, id, season, episode) => {
        if (type === 'movie') return `https://embed.su/embed/movie/${id}`;
        return `https://embed.su/embed/tv/${id}/${season}/${episode}`;
    },
    "SuperEmbed": (type, id, season, episode) => {
        if (type === 'movie') return `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`;
        return `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
    },
    "AutoEmbed": (type, id, season, episode) => {
        if (type === 'movie') return `https://autoembed.co/movie/tmdb/${id}`;
        return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
    },
    "VidLink": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidlink.pro/movie/${id}`;
        return `https://vidlink.pro/tv/${id}/${season}/${episode}`;
    },
    "MoviesAPI": (type, id, season, episode) => {
        if (type === 'movie') return `https://moviesapi.club/movie/${id}`;
        return `https://moviesapi.club/tv/${id}-${season}-${episode}`;
    },
    "SmashyStream": (type, id, season, episode) => {
        if (type === 'movie') return `https://embed.smashystream.com/playere.php?tmdb=${id}`;
        return `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${season}&episode=${episode}`;
    }
};

// ============================================
// ESTADO GLOBAL
// ============================================
const state = {
    currentSection: 'home',
    moviePage: 1,
    seriesPage: 1,
    movieGenre: '',
    seriesGenre: '',
    movieSort: 'popularity.desc',
    seriesSort: 'popularity.desc',
    currentDetail: null,
    currentSeason: 1,
    currentEpisode: 1,
    torrents: [],
    imdbCache: {} // Cache de IMDB IDs para no repetir peticiones
};

// ============================================
// VALIDACIÓN INICIAL
// ============================================
function isValidApiKey(key) {
    return key && key.length === 32 && /^[a-f0-9]+$/i.test(key);
}

if (!isValidApiKey(API_KEY)) {
    console.error("❌ API Key inválida:", API_KEY);
    document.addEventListener('DOMContentLoaded', () => {
        alert(
            "⚠️ API Key de TMDB no configurada o inválida\n\n" +
            "1. Ve a: https://www.themoviedb.org/settings/api\n" +
            "2. Copia tu 'API Key (v3 auth)'\n" +
            "3. Edita js/app.js línea 5\n" +
            "4. Reemplaza 'TU_API_KEY_REAL_AQUI' con tu clave"
        );
    });
}

// ============================================
// UTILIDADES
// ============================================
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

async function fetchTMDB(endpoint) {
    if (!isValidApiKey(API_KEY)) {
        throw new Error('API Key inválida');
    }
    
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=es-ES`;
    
    try {
        const response = await fetch(url);
        
        if (response.status === 401) throw new Error('API Key inválida');
        if (response.status === 429) throw new Error('Demasiadas peticiones');
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        return await response.json();
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Error de conexión');
        }
        throw error;
    }
}

function createCard(item, type) {
    const title = item.title || item.name || 'Sin título';
    const date = item.release_date || item.first_air_date || '';
    const year = date.substring(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const poster = item.poster_path 
        ? `${IMG_URL}${item.poster_path}` 
        : 'https://via.placeholder.com/500x750/1a1a1a/666?text=Sin+Poster';

    const detailUrl = type === 'movie' ? `#/movie/${item.id}` : `#/tv/${item.id}`;

    return `
        <a href="${detailUrl}" class="card" style="text-decoration:none;color:inherit;">
            <img src="${poster}" alt="${title}" class="card-poster" loading="lazy" 
                 onerror="this.src='https://via.placeholder.com/500x750/1a1a1a/666?text=Sin+Poster'">
            <div class="card-play"><i class="fa-solid fa-play"></i></div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year || 'N/A'}</span>
                    <span class="card-rating">⭐ ${rating}</span>
                </div>
            </div>
        </a>
    `;
}

function renderCards(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">No hay contenido disponible</p>';
        return;
    }
    
    container.innerHTML = items.map(item => createCard(item, type)).join('');
}

// ============================================
// BÚSQUEDA DE TORRENTS (Torrentio con CORS proxy)
// ============================================
async function getImdbId(type, tmdbId) {
    // Verificar cache
    const cacheKey = `${type}_${tmdbId}`;
    if (state.imdbCache[cacheKey]) {
        return state.imdbCache[cacheKey];
    }
    
    try {
        const details = await fetchTMDB(`/${type}/${tmdbId}`);
        const imdbId = details.imdb_id;
        if (imdbId) {
            state.imdbCache[cacheKey] = imdbId;
        }
        return imdbId;
    } catch (error) {
        console.error('Error obteniendo IMDB ID:', error);
        return null;
    }
}

async function searchTorrents(type, tmdbId, season, episode) {
    try {
        // 1. Obtener IMDB ID (Torrentio requiere IMDB, no TMDB)
        const imdbId = await getImdbId(type, tmdbId);
        
        if (!imdbId) {
            console.warn('No se encontró IMDB ID para TMDB:', tmdbId);
            return [];
        }
        
        // 2. Construir ID de Stremio (usa formato IMDB: tt1234567)
        let stremId;
        if (type === 'movie') {
            stremId = `movie/${imdbId}`;
        } else {
            stremId = `series/${imdbId}/${season}/${episode}`;
        }
        
        // 3. Hacer petición vía proxy CORS
        const targetUrl = `${TORRENTIO_URL}/stream/${stremId}.json`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // 4. Procesar streams con manejo robusto
        const torrents = (data.streams || []).map(stream => {
            const titleParts = (stream.title || '').split('\n');
            const name = titleParts[0] || 'Torrent';
            const info = (stream.title || '').toLowerCase();
            
            // Múltiples formatos de tamaño (Torrentio usa 💾, otros usan GB/MB)
            const sizeMatch = info.match(/💾\s*([\d.]+\s*[MG]B)/i)
                || info.match(/size:?\s*([\d.]+\s*[MG]B)/i)
                || info.match(/([\d.]+)\s*(gb|mb)/i);
            
            // Múltiples formatos de seeds
            const seedsMatch = info.match(/👤\s*(\d+)/i)
                || info.match(/seeds?:?\s*(\d+)/i)
                || info.match(/👥\s*(\d+)/i);
            
            const providerMatch = (stream.title || '').match(/\[(.+?)\]/);
            
            // Magnet: preferir URL completa, si no hay construir desde infoHash
            let magnet = stream.url || stream.externalUrl;
            if (!magnet && stream.infoHash) {
                const tracker = 'udp://tracker.opentrackr.org:1337/announce';
                magnet = `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(name)}&tr=${encodeURIComponent(tracker)}`;
            }
            
            return {
                name,
                fullTitle: stream.title || name,
                infoHash: stream.infoHash,
                magnet,
                size: sizeMatch ? sizeMatch[1] : 'N/A',
                seeds: seedsMatch ? parseInt(seedsMatch[1]) : 0,
                provider: providerMatch ? providerMatch[1] : 'Desconocido',
                quality: detectQuality(name)
            };
        }).filter(t => t.magnet);
        
        // Ordenar: primero por calidad, luego por seeds
        const qualityOrder = { '4K': 4, '1080p': 3, '720p': 2, '480p': 1, 'SD': 0 };
        torrents.sort((a, b) => {
            const qDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
            if (qDiff !== 0) return qDiff;
            return b.seeds - a.seeds;
        });
        
        return torrents;
        
    } catch (error) {
        console.error('Error buscando torrents:', error);
        // Mostrar error específico al usuario
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.warn('Posible bloqueo CORS. Considera usar un backend propio.');
        }
        return [];
    }
}

function detectQuality(name) {
    const lower = name.toLowerCase();
    if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '4K';
    if (lower.includes('1080p')) return '1080p';
    if (lower.includes('720p')) return '720p';
    if (lower.includes('480p')) return '480p';
    if (lower.includes('hdtv')) return 'HDTV';
    if (lower.includes('web') || lower.includes('webrip')) return 'WEB';
    return 'SD';
}

function renderTorrents(torrents) {
    const container = document.getElementById('torrentsList');
    if (!container) return;
    
    if (!torrents || torrents.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">😕 No se encontraron torrents. Puede ser un error de CORS o el contenido no está disponible.</p>';
        return;
    }
    
    container.innerHTML = torrents.map((t, index) => `
        <div class="torrent-item">
            <div class="torrent-info">
                <h4>${escapeHtml(t.name)}</h4>
                <div class="torrent-meta">
                    <span class="seeds"><i class="fa-solid fa-arrow-up"></i> ${t.seeds}</span>
                    <span class="size"><i class="fa-solid fa-database"></i> ${t.size}</span>
                    <span class="provider"><i class="fa-solid fa-server"></i> ${escapeHtml(t.provider)}</span>
                    <span class="quality"><i class="fa-solid fa-film"></i> ${t.quality}</span>
                </div>
            </div>
            <div class="torrent-actions">
                <a href="${t.magnet}" class="btn-magnet" title="Abrir con cliente torrent">
                    <i class="fa-solid fa-magnet"></i> Magnet
                </a>
                <button class="btn-copy-magnet" data-index="${index}" title="Copiar enlace">
                    <i class="fa-solid fa-copy"></i> Copiar
                </button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyMagnet(index) {
    const torrent = state.torrents[index];
    if (!torrent || !torrent.magnet) return;
    
    navigator.clipboard.writeText(torrent.magnet).then(() => {
        const btn = document.querySelector(`.btn-copy-magnet[data-index="${index}"]`);
        if (!btn) return;
        
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = torrent.magnet;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

// Event delegation para copiar magnets (evita problemas con onclick dinámico)
document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.btn-copy-magnet');
    if (copyBtn) {
        const index = parseInt(copyBtn.dataset.index);
        copyMagnet(index);
    }
});

// ============================================
// NAVEGACIÓN
// ============================================
function navigateTo(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const sectionEl = document.getElementById(section);
    if (sectionEl) sectionEl.classList.add('active');
    
    const navLink = document.querySelector(`[data-section="${section}"]`);
    if (navLink) navLink.classList.add('active');
    
    state.currentSection = section;
    window.scrollTo(0, 0);
}

function handleRoute() {
    const hash = window.location.hash || '#/';
    const parts = hash.substring(2).split('/');
    
    if (parts[0] === '' || parts[0] === 'home') {
        navigateTo('home');
    } else if (parts[0] === 'movies') {
        navigateTo('movies');
        loadMovies();
    } else if (parts[0] === 'series') {
        navigateTo('series');
        loadSeries();
    } else if (parts[0] === 'search') {
        navigateTo('search');
        const query = parts[1] ? decodeURIComponent(parts[1]) : '';
        if (query) searchContent(query);
    } else if (parts[0] === 'movie' && parts[1]) {
        navigateTo('detail');
        showDetail('movie', parts[1]);
    } else if (parts[0] === 'tv' && parts[1]) {
        navigateTo('detail');
        showDetail('tv', parts[1]);
    } else if (parts[0] === 'play' && parts[2]) {
        navigateTo('player');
        const type = parts[1];
        const id = parts[2];
        const season = parts[3] || 1;
        const episode = parts[4] || 1;
        loadPlayer(type, id, season, episode);
    } else {
        navigateTo('home');
    }
}

// ============================================
// HOME
// ============================================
async function loadHome() {
    try {
        showLoading();
        
        const [trending, popularMovies, topRated, popularSeries] = await Promise.all([
            fetchTMDB('/trending/all/week'),
            fetchTMDB('/movie/popular'),
            fetchTMDB('/movie/top_rated'),
            fetchTMDB('/tv/popular')
        ]);
        
        if (trending.results && trending.results.length > 0) {
            const hero = trending.results[0];
            const heroType = hero.media_type === 'movie' ? 'movie' : 'tv';
            
            const heroEl = document.getElementById('hero');
            if (hero.backdrop_path && heroEl) {
                heroEl.style.backgroundImage = `url(${BACKDROP_URL}${hero.backdrop_path})`;
            }
            
            const heroTitle = document.getElementById('heroTitle');
            if (heroTitle) heroTitle.textContent = hero.title || hero.name;
            
            const heroDesc = document.getElementById('heroDesc');
            if (heroDesc) heroDesc.textContent = hero.overview || '';
            
            const heroPlay = document.getElementById('heroPlay');
            if (heroPlay) {
                heroPlay.onclick = () => {
                    if (heroType === 'movie') {
                        window.location.hash = `#/play/movie/${hero.id}/1/1`;
                    } else {
                        window.location.hash = `#/play/tv/${hero.id}/1/1`;
                    }
                };
            }
            
            const heroInfo = document.getElementById('heroInfo');
            if (heroInfo) {
                heroInfo.onclick = () => {
                    window.location.hash = `#/${heroType}/${hero.id}`;
                };
            }
        }
        
        renderCards('popularMovies', popularMovies.results.slice(0, 12), 'movie');
        renderCards('trendingSeries', popularSeries.results.slice(0, 12), 'tv');
        renderCards('topRatedMovies', topRated.results.slice(0, 12), 'movie');
        renderCards('popularSeries', trending.results.filter(i => i.media_type === 'tv').slice(0, 12), 'tv');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar la página: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// PELÍCULAS
// ============================================
async function loadMovies() {
    try {
        showLoading();
        let endpoint = `/discover/movie?sort_by=${state.movieSort}&page=${state.moviePage}`;
        if (state.movieGenre) endpoint += `&with_genres=${state.movieGenre}`;
        
        const data = await fetchTMDB(endpoint);
        renderCards('moviesGrid', data.results, 'movie');
        
        const pageEl = document.getElementById('moviePage');
        if (pageEl) pageEl.textContent = `Página ${state.moviePage}`;
        
        const prevBtn = document.getElementById('prevMovies');
        if (prevBtn) prevBtn.disabled = state.moviePage === 1;
        
    } catch (error) {
        console.error(error);
        alert('Error al cargar películas: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SERIES
// ============================================
async function loadSeries() {
    try {
        showLoading();
        let endpoint = `/discover/tv?sort_by=${state.seriesSort}&page=${state.seriesPage}`;
        if (state.seriesGenre) endpoint += `&with_genres=${state.seriesGenre}`;
        
        const data = await fetchTMDB(endpoint);
        renderCards('seriesGrid', data.results, 'tv');
        
        const pageEl = document.getElementById('seriesPage');
        if (pageEl) pageEl.textContent = `Página ${state.seriesPage}`;
        
        const prevBtn = document.getElementById('prevSeries');
        if (prevBtn) prevBtn.disabled = state.seriesPage === 1;
        
    } catch (error) {
        console.error(error);
        alert('Error al cargar series: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// BÚSQUEDA
// ============================================
async function searchContent(query) {
    if (!query) return;
    
    try {
        showLoading();
        const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
        const results = data.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv');
        
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:40px;color:#999;">No se encontraron resultados</p>';
        } else {
            container.innerHTML = results.map(item => 
                createCard(item, item.media_type)
            ).join('');
        }
        
    } catch (error) {
        console.error(error);
        alert('Error en la búsqueda: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// DETALLE
// ============================================
async function showDetail(type, id) {
    try {
        showLoading();
        const data = await fetchTMDB(`/${type}/${id}`);
        state.currentDetail = { type, data };
        
        const title = data.title || data.name;
        const poster = data.poster_path ? `${IMG_URL}${data.poster_path}` : '';
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const genres = (data.genres || []).map(g => `<span class="genre-tag">${g.name}</span>`).join('');
        
        let html = `
            <div class="detail-hero">
                <img src="${poster}" alt="${title}" class="detail-poster"
                     onerror="this.src='https://via.placeholder.com/500x750/1a1a1a/666?text=Sin+Poster'">
                <div class="detail-info">
                    <h1>${escapeHtml(title)}</h1>
                    <div class="detail-meta">
                        <span><i class="fa-solid fa-calendar"></i> ${year}</span>
                        <span><i class="fa-solid fa-star" style="color:#ffc107;"></i> ${rating}/10</span>
                        <span><i class="fa-solid fa-language"></i> ${(data.original_language || '').toUpperCase()}</span>
                        ${type === 'movie' && data.runtime ? `<span><i class="fa-solid fa-clock"></i> ${data.runtime} min</span>` : ''}
                        ${type === 'tv' && data.number_of_seasons ? `<span><i class="fa-solid fa-list"></i> ${data.number_of_seasons} Temporadas</span>` : ''}
                    </div>
                    <div class="detail-genres">${genres}</div>
                    <p class="detail-overview">${escapeHtml(data.overview) || 'Sin descripción disponible.'}</p>
                    <div class="detail-actions">
                        <button class="btn btn-primary" id="btnPlayDetail">
                            <i class="fa-solid fa-play"></i> Reproducir
                        </button>
                        <a href="https://www.themoviedb.org/${type}/${id}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                            <i class="fa-solid fa-external-link"></i> Ver en TMDB
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        if (type === 'tv' && data.seasons) {
            const validSeasons = data.seasons.filter(s => s.season_number > 0);
            html += `
                <div class="seasons-selector">
                    <h3><i class="fa-solid fa-list"></i> Episodios</h3>
                    <div class="season-tabs">
                        ${validSeasons.map(s => `
                            <div class="season-tab ${s.season_number === 1 ? 'active' : ''}" 
                                 data-season="${s.season_number}" data-id="${id}">
                                Temporada ${s.season_number}
                            </div>
                        `).join('')}
                    </div>
                    <div class="episodes-list" id="episodesList"></div>
                </div>
            `;
        }
        
        const detailContent = document.getElementById('detailContent');
        if (detailContent) detailContent.innerHTML = html;
        
        // Event delegation para botón de reproducir
        const btnPlayDetail = document.getElementById('btnPlayDetail');
        if (btnPlayDetail) {
            btnPlayDetail.addEventListener('click', playDetail);
        }
        
        // Event delegation para tabs de temporada
        document.querySelectorAll('.season-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const season = e.target.dataset.season;
                loadEpisodes(id, season, e.target);
            });
        });
        
        if (type === 'tv') {
            loadEpisodes(id, 1);
        }
        
    } catch (error) {
        console.error(error);
        alert('Error al cargar detalles: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function loadEpisodes(tvId, season, tabElement) {
    try {
        state.currentSeason = parseInt(season);
        
        if (tabElement) {
            document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
            tabElement.classList.add('active');
        }
        
        const data = await fetchTMDB(`/tv/${tvId}/season/${season}`);
        const container = document.getElementById('episodesList');
        if (!container) return;
        
        container.innerHTML = (data.episodes || []).map(ep => {
            const thumb = ep.still_path ? `${IMG_URL}${ep.still_path}` : 'https://via.placeholder.com/320x180/1a1a1a/666?text=Sin+Imagen';
            return `
                <div class="episode-card">
                    <img src="${thumb}" alt="Ep ${ep.episode_number}" class="episode-thumb"
                         onerror="this.src='https://via.placeholder.com/320x180/1a1a1a/666?text=Sin+Imagen'">
                    <div class="episode-info">
                        <h4>E${ep.episode_number}: ${escapeHtml(ep.name) || 'Sin título'}</h4>
                        <p>${escapeHtml(ep.overview) || 'Sin descripción'}</p>
                    </div>
                    <button class="btn btn-primary btn-play-episode" 
                            data-tvid="${tvId}" data-season="${season}" data-episode="${ep.episode_number}">
                        <i class="fa-solid fa-play"></i> Ver
                    </button>
                </div>
            `;
        }).join('');
        
        // Event delegation para botones de episodios
        container.querySelectorAll('.btn-play-episode').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const { tvid, season, episode } = e.currentTarget.dataset;
                window.location.hash = `#/play/tv/${tvid}/${season}/${episode}`;
            });
        });
        
    } catch (error) {
        console.error(error);
        alert('Error al cargar episodios: ' + error.message);
    }
}

function playDetail() {
    const { type, data } = state.currentDetail;
    if (!data) return;
    
    if (type === 'movie') {
        window.location.hash = `#/play/movie/${data.id}/1/1`;
    } else {
        window.location.hash = `#/play/tv/${data.id}/1/1`;
    }
}

// ============================================
// REPRODUCTOR + TORRENTS
// ============================================
async function loadPlayer(type, id, season, episode) {
    season = parseInt(season) || 1;
    episode = parseInt(episode) || 1;
    
    const servers = Object.keys(VIDEO_SERVERS);
    const controls = document.getElementById('playerControls');
    const playerTitle = document.getElementById('playerTitle');
    const torrentsSection = document.getElementById('torrentsSection');
    const player = document.getElementById('videoPlayer');
    
    if (!controls) return;
    
    // Cargar título
    try {
        const data = await fetchTMDB(`/${type}/${id}`);
        if (playerTitle) {
            const title = data.title || data.name;
            if (type === 'tv') {
                playerTitle.textContent = `${title} - T${season} E${episode}`;
            } else {
                playerTitle.textContent = title;
            }
        }
    } catch (err) {
        console.error('Error cargando título:', err);
    }
    
    // Crear botones de servidores
    controls.innerHTML = `
        <span style="color:#999;margin-right:10px;">Servidores:</span>
        ${servers.map((s, i) => `
            <button class="server-btn ${i === 0 ? 'active' : ''}" 
                    data-server="${s}" data-type="${type}" data-id="${id}" 
                    data-season="${season}" data-episode="${episode}">
                ${s}
            </button>
        `).join('')}
    `;
    
    // Event delegation para servidores
    controls.addEventListener('click', (e) => {
        const btn = e.target.closest('.server-btn');
        if (btn) {
            const { server, type, id, season, episode } = btn.dataset;
            changeServer(server, type, id, parseInt(season), parseInt(episode), btn);
        }
    });
    
    // Configurar iframe con atributos necesarios
    if (player) {
        player.setAttribute('allowfullscreen', 'true');
        player.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        player.setAttribute('referrerpolicy', 'origin');
        player.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-popups');
    }
    
    // Cargar el primer servidor
    changeServer(servers[0], type, id, season, episode);
    
    // Buscar torrents
    if (torrentsSection) {
        torrentsSection.style.display = 'block';
        const torrentsList = document.getElementById('torrentsList');
        if (torrentsList) {
            torrentsList.innerHTML = '<p style="text-align:center;padding:20px;color:#999;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando torrents en múltiples proveedores...</p>';
        }
        
        const torrents = await searchTorrents(type, id, season, episode);
        state.torrents = torrents;
        renderTorrents(torrents);
    }
}

function changeServer(server, type, id, season, episode, btnElement) {
    const serverFn = VIDEO_SERVERS[server];
    if (!serverFn) return;
    
    const url = serverFn(type, id, season, episode);
    const player = document.getElementById('videoPlayer');
    if (player) player.src = url;
    
    if (btnElement) {
        document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
}

// ============================================
// GÉNEROS
// ============================================
async function loadGenres() {
    try {
        const [movieGenres, tvGenres] = await Promise.all([
            fetchTMDB('/genre/movie/list'),
            fetchTMDB('/genre/tv/list')
        ]);
        
        const movieSelect = document.getElementById('movieGenre');
        const seriesSelect = document.getElementById('seriesGenre');
        
        if (movieSelect) {
            movieGenres.genres.forEach(g => {
                movieSelect.innerHTML += `<option value="${g.id}">${escapeHtml(g.name)}</option>`;
            });
        }
        
        if (seriesSelect) {
            tvGenres.genres.forEach(g => {
                seriesSelect.innerHTML += `<option value="${g.id}">${escapeHtml(g.name)}</option>`;
            });
        }
        
    } catch (error) {
        console.error('Error cargando géneros:', error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput ? searchInput.value.trim() : '';
            if (query) {
                window.location.hash = `#/search/${encodeURIComponent(query)}`;
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchBtn) {
                searchBtn.click();
            }
        });
    }
    
    const movieGenre = document.getElementById('movieGenre');
    const movieSort = document.getElementById('movieSort');
    const prevMovies = document.getElementById('prevMovies');
    const nextMovies = document.getElementById('nextMovies');
    
    if (movieGenre) {
        movieGenre.addEventListener('change', (e) => {
            state.movieGenre = e.target.value;
            state.moviePage = 1;
            loadMovies();
        });
    }
    
    if (movieSort) {
        movieSort.addEventListener('change', (e) => {
            state.movieSort = e.target.value;
            state.moviePage = 1;
            loadMovies();
        });
    }
    
    if (prevMovies) {
        prevMovies.addEventListener('click', () => {
            if (state.moviePage > 1) {
                state.moviePage--;
                loadMovies();
            }
        });
    }
    
    if (nextMovies) {
        nextMovies.addEventListener('click', () => {
            state.moviePage++;
            loadMovies();
        });
    }
    
    const seriesGenre = document.getElementById('seriesGenre');
    const seriesSort = document.getElementById('seriesSort');
    const prevSeries = document.getElementById('prevSeries');
    const nextSeries = document.getElementById('nextSeries');
    
    if (seriesGenre) {
        seriesGenre.addEventListener('change', (e) => {
            state.seriesGenre = e.target.value;
            state.seriesPage = 1;
            loadSeries();
        });
    }
    
    if (seriesSort) {
        seriesSort.addEventListener('change', (e) => {
            state.seriesSort = e.target.value;
            state.seriesPage = 1;
            loadSeries();
        });
    }
    
    if (prevSeries) {
        prevSeries.addEventListener('click', () => {
            if (state.seriesPage > 1) {
                state.seriesPage--;
                loadSeries();
            }
        });
    }
    
    if (nextSeries) {
        nextSeries.addEventListener('click', () => {
            state.seriesPage++;
            loadSeries();
        });
    }
    
    window.addEventListener('hashchange', handleRoute);
    
    loadGenres();
    loadHome();
    handleRoute();
});

console.log('✅ CineStream cargado correctamente');
console.log('📝 Servidores:', Object.keys(VIDEO_SERVERS).join(', '));
console.log('🧲 Torrents: YTS, EZTV, RARBG, 1337x, ThePirateBay, KickassTorrents, TorrentGalaxy, MagnetDL, y más');
console.log('⚠️ Nota: Para producción, configura tu propio backend proxy CORS.');
