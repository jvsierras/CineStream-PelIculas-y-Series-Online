// ============================================
// CONFIGURACIÓN
// ============================================
// ⚠️ IMPORTANTE: Reemplaza con tu API Key real de TMDB
// Obtén una gratis en: https://www.themoviedb.org/settings/api
const API_KEY = "686e8f50b2135e3c32f670ec018df888"; // ← CAMBIA ESTO
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

// Servidores de video embebido (con alternativas por si uno falla)
const VIDEO_SERVERS = {
    "VidSrc PRO": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidsrc.pro/embed/movie/${id}`;
        return `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}`;
    },
    "VidSrc XYZ": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${id}`;
        return `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`;
    },
    "Embed SU": (type, id, season, episode) => {
        if (type === 'movie') return `https://embed.su/embed/movie/${id}`;
        return `https://embed.su/embed/tv/${id}/${season}/${episode}`;
    },
    "MultiEmbed": (type, id, season, episode) => {
        if (type === 'movie') return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
    },
    "2Embed": (type, id, season, episode) => {
        if (type === 'movie') return `https://www.2embed.cc/embed/${id}`;
        return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
    },
    "VidLink": (type, id, season, episode) => {
        if (type === 'movie') return `https://vidlink.pro/movie/${id}`;
        return `https://vidlink.pro/tv/${id}/${season}/${episode}`;
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
    currentEpisode: 1
};

// ============================================
// VALIDACIÓN INICIAL
// ============================================
function isValidApiKey(key) {
    // Una API Key de TMDB tiene 32 caracteres alfanuméricos
    return key && key.length === 32 && /^[a-f0-9]+$/i.test(key);
}

if (!isValidApiKey(API_KEY)) {
    console.error("❌ API Key inválida:", API_KEY);
    console.error("📝 Debe ser una cadena de 32 caracteres alfanuméricos");
    console.error("🔗 Obtén una gratis en: https://www.themoviedb.org/settings/api");
    
    document.addEventListener('DOMContentLoaded', () => {
        alert(
            "⚠️ API Key de TMDB no configurada o inválida\n\n" +
            "1. Ve a: https://www.themoviedb.org/settings/api\n" +
            "2. Copia tu 'API Key (v3 auth)'\n" +
            "3. Edita js/app.js línea 5\n" +
            "4. Reemplaza 'TU_API_KEY_REAL_AQUI' con tu clave\n\n" +
            "La clave debe tener 32 caracteres (ej: 686e8f50b2135e3c32f670ec018df888)"
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
        throw new Error('API Key inválida. Edita js/app.js y configura tu clave real de TMDB');
    }
    
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=es-ES`;
    
    try {
        const response = await fetch(url);
        
        if (response.status === 401) {
            throw new Error('API Key inválida (401). Verifica tu clave en TMDB');
        }
        if (response.status === 429) {
            throw new Error('Demasiadas peticiones. Espera un momento e intenta de nuevo');
        }
        if (!response.ok) {
            throw new Error(`Error ${response.status} al cargar datos`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Error de conexión. Verifica tu internet');
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
        const genres = data.genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('');
        
        let html = `
            <div class="detail-hero">
                <img src="${poster}" alt="${title}" class="detail-poster"
                     onerror="this.src='https://via.placeholder.com/500x750/1a1a1a/666?text=Sin+Poster'">
                <div class="detail-info">
                    <h1>${title}</h1>
                    <div class="detail-meta">
                        <span><i class="fa-solid fa-calendar"></i> ${year}</span>
                        <span><i class="fa-solid fa-star" style="color:#ffc107;"></i> ${rating}/10</span>
                        <span><i class="fa-solid fa-language"></i> ${data.original_language?.toUpperCase()}</span>
                        ${type === 'movie' && data.runtime ? `<span><i class="fa-solid fa-clock"></i> ${data.runtime} min</span>` : ''}
                        ${type === 'tv' && data.number_of_seasons ? `<span><i class="fa-solid fa-list"></i> ${data.number_of_seasons} Temporadas</span>` : ''}
                    </div>
                    <div class="detail-genres">${genres}</div>
                    <p class="detail-overview">${data.overview || 'Sin descripción disponible.'}</p>
                    <div class="detail-actions">
                        <button class="btn btn-primary" onclick="playDetail()">
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
                                 onclick="loadEpisodes(${id}, ${s.season_number}, this)">
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
        state.currentSeason = season;
        
        if (tabElement) {
            document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
            tabElement.classList.add('active');
        }
        
        const data = await fetchTMDB(`/tv/${tvId}/season/${season}`);
        const container = document.getElementById('episodesList');
        if (!container) return;
        
        container.innerHTML = data.episodes.map(ep => {
            const thumb = ep.still_path ? `${IMG_URL}${ep.still_path}` : 'https://via.placeholder.com/320x180/1a1a1a/666?text=Sin+Imagen';
            return `
                <div class="episode-card">
                    <img src="${thumb}" alt="Ep ${ep.episode_number}" class="episode-thumb"
                         onerror="this.src='https://via.placeholder.com/320x180/1a1a1a/666?text=Sin+Imagen'">
                    <div class="episode-info">
                        <h4>E${ep.episode_number}: ${ep.name || 'Sin título'}</h4>
                        <p>${ep.overview || 'Sin descripción'}</p>
                    </div>
                    <button class="btn btn-primary" onclick="window.location.hash='#/play/tv/${tvId}/${season}/${ep.episode_number}'">
                        <i class="fa-solid fa-play"></i> Ver
                    </button>
                </div>
            `;
        }).join('');
        
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
// REPRODUCTOR
// ============================================
function loadPlayer(type, id, season, episode) {
    const servers = Object.keys(VIDEO_SERVERS);
    const controls = document.getElementById('playerControls');
    const playerTitle = document.getElementById('playerTitle');
    
    if (!controls) return;
    
    // Cargar título
    fetchTMDB(`/${type}/${id}`).then(data => {
        if (playerTitle) {
            const title = data.title || data.name;
            if (type === 'tv') {
                playerTitle.textContent = `${title} - T${season} E${episode}`;
            } else {
                playerTitle.textContent = title;
            }
        }
    }).catch(err => console.error('Error cargando título:', err));
    
    // Crear botones de servidores
    controls.innerHTML = `
        <span style="color:#999;margin-right:10px;">Servidores:</span>
        ${servers.map((s, i) => `
            <button class="server-btn ${i === 0 ? 'active' : ''}" 
                    onclick="changeServer('${s}', '${type}', ${id}, ${season}, ${episode}, this)">
                ${s}
            </button>
        `).join('')}
    `;
    
    // Cargar el primer servidor
    changeServer(servers[0], type, id, season, episode);
}

function changeServer(server, type, id, season, episode, btnElement) {
    const url = VIDEO_SERVERS[server](type, id, season, episode);
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
                movieSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
            });
        }
        
        if (seriesSelect) {
            tvGenres.genres.forEach(g => {
                seriesSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
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
    
    // Filtros películas
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
    
    // Filtros series
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
    
    // Router
    window.addEventListener('hashchange', handleRoute);
    
    // Inicializar
    loadGenres();
    loadHome();
    handleRoute();
});

console.log('✅ CineStream cargado correctamente');
console.log('📝 Servidores disponibles:', Object.keys(VIDEO_SERVERS).join(', '));
