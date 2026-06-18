// ============================================
// CONFIGURACIÓN
// ============================================
const API_KEY = "TU_API_KEY_AQUI"; // ⚠️ REEMPLAZA CON TU API KEY DE TMDB
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

// Servidores de video embebido (múltiples opciones por si uno falla)
const VIDEO_SERVERS = {
    vidsrc: (type, id, season, episode) => {
        if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${id}`;
        return `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`;
    },
    embedsu: (type, id, season, episode) => {
        if (type === 'movie') return `https://embed.su/embed/movie/${id}`;
        return `https://embed.su/embed/tv/${id}/${season}/${episode}`;
    },
    multiembed: (type, id, season, episode) => {
        if (type === 'movie') return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
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
// UTILIDADES
// ============================================
function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

async function fetchTMDB(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=es-ES`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al cargar datos');
    return response.json();
}

function createCard(item, type) {
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date || '';
    const year = date.substring(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const poster = item.poster_path 
        ? `${IMG_URL}${item.poster_path}` 
        : 'https://via.placeholder.com/500x750/1a1a1a/666?text=Sin+Poster';

    return `
        <div class="card" onclick="showDetail('${type}', ${item.id})">
            <img src="${poster}" alt="${title}" class="card-poster" loading="lazy">
            <div class="card-play"><i class="fa-solid fa-play"></i></div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year || 'N/A'}</span>
                    <span class="card-rating">⭐ ${rating}</span>
                </div>
            </div>
        </div>
    `;
}

function renderCards(containerId, items, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => createCard(item, type)).join('');
}

// ============================================
// NAVEGACIÓN
// ============================================
function navigateTo(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(section).classList.add('active');
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
    
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
    } else if (parts[0] === 'play') {
        navigateTo('player');
        playContent(parts[1], parts[2], parts[3], parts[4]);
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

        // Hero banner con contenido trending
        const hero = trending.results[0];
        const heroType = hero.media_type === 'movie' ? 'movie' : 'tv';
        
        document.getElementById('hero').style.backgroundImage = 
            `url(${BACKDROP_URL}${hero.backdrop_path})`;
        document.getElementById('heroTitle').textContent = hero.title || hero.name;
        document.getElementById('heroDesc').textContent = hero.overview;
        
        document.getElementById('heroPlay').onclick = () => {
            if (heroType === 'movie') {
                playContent('movie', hero.id);
            } else {
                playContent('tv', hero.id, 1, 1);
            }
        };
        
        document.getElementById('heroInfo').onclick = () => {
            window.location.hash = `#/${heroType}/${hero.id}`;
        };

        renderCards('popularMovies', popularMovies.results.slice(0, 12), 'movie');
        renderCards('trendingSeries', popularSeries.results.slice(0, 12), 'tv');
        renderCards('topRatedMovies', topRated.results.slice(0, 12), 'movie');
        renderCards('popularSeries', trending.results.filter(i => i.media_type === 'tv').slice(0, 12), 'tv');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar la página. Verifica tu API Key.');
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
        document.getElementById('moviePage').textContent = `Página ${state.moviePage}`;
        document.getElementById('prevMovies').disabled = state.moviePage === 1;
        
    } catch (error) {
        console.error(error);
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
        document.getElementById('seriesPage').textContent = `Página ${state.seriesPage}`;
        document.getElementById('prevSeries').disabled = state.seriesPage === 1;
        
    } catch (error) {
        console.error(error);
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
        if (results.length === 0) {
            container.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:40px;color:#999;">No se encontraron resultados</p>';
        } else {
            container.innerHTML = results.map(item => 
                createCard(item, item.media_type)
            ).join('');
        }
        
    } catch (error) {
        console.error(error);
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
                <img src="${poster}" alt="${title}" class="detail-poster">
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
                        <a href="https://www.themoviedb.org/${type}/${id}" target="_blank" class="btn btn-secondary">
                            <i class="fa-solid fa-external-link"></i> Ver en TMDB
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // Si es serie, mostrar temporadas y episodios
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
        
        document.getElementById('detailContent').innerHTML = html;
        
        if (type === 'tv') {
            loadEpisodes(id, 1);
        }
        
    } catch (error) {
        console.error(error);
        alert('Error al cargar detalles');
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
        
        container.innerHTML = data.episodes.map(ep => {
            const thumb = ep.still_path ? `${IMG_URL}${ep.still_path}` : 'https://via.placeholder.com/320x180/1a1a1a/666?text=Sin+Imagen';
            return `
                <div class="episode-card">
                    <img src="${thumb}" alt="Ep ${ep.episode_number}" class="episode-thumb">
                    <div class="episode-info">
                        <h4>E${ep.episode_number}: ${ep.name}</h4>
                        <p>${ep.overview || 'Sin descripción'}</p>
                    </div>
                    <button class="btn btn-primary" onclick="playContent('tv', ${tvId}, ${season}, ${ep.episode_number})">
                        <i class="fa-solid fa-play"></i> Ver
                    </button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error(error);
    }
}

function playDetail() {
    const { type, data } = state.currentDetail;
    if (type === 'movie') {
        window.location.hash = `#/play/movie/${data.id}`;
    } else {
        window.location.hash = `#/play/tv/${data.id}/1/1`;
    }
}

// ============================================
// REPRODUCTOR
// ============================================
function playContent(type, id, season = 1, episode = 1) {
    window.location.hash = `#/play/${type}/${id}/${season}/${episode}`;
}

function loadPlayer(type, id, season, episode) {
    const servers = Object.keys(VIDEO_SERVERS);
    const controls = document.getElementById('playerControls');
    
    controls.innerHTML = `
        <span style="color:#999;margin-right:10px;">Servidores:</span>
        ${servers.map((s, i) => `
            <button class="server-btn ${i === 0 ? 'active' : ''}" onclick="changeServer('${s}', '${type}', ${id}, ${season}, ${episode}, this)">
                ${s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
        `).join('')}
    `;
    
    changeServer(servers[0], type, id, season, episode);
}

function changeServer(server, type, id, season, episode, btnElement) {
    const url = VIDEO_SERVERS[server](type, id, season, episode);
    document.getElementById('videoPlayer').src = url;
    
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
        
        movieGenres.genres.forEach(g => {
            movieSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        
        tvGenres.genres.forEach(g => {
            seriesSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        
    } catch (error) {
        console.error(error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Búsqueda
    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            window.location.hash = `#/search/${encodeURIComponent(query)}`;
        }
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('searchBtn').click();
        }
    });
    
    // Filtros películas
    document.getElementById('movieGenre').addEventListener('change', (e) => {
        state.movieGenre = e.target.value;
        state.moviePage = 1;
        loadMovies();
    });
    
    document.getElementById('movieSort').addEventListener('change', (e) => {
        state.movieSort = e.target.value;
        state.moviePage = 1;
        loadMovies();
    });
    
    document.getElementById('prevMovies').addEventListener('click', () => {
        if (state.moviePage > 1) {
            state.moviePage--;
            loadMovies();
        }
    });
    
    document.getElementById('nextMovies').addEventListener('click', () => {
        state.moviePage++;
        loadMovies();
    });
    
    // Filtros series
    document.getElementById('seriesGenre').addEventListener('change', (e) => {
        state.seriesGenre = e.target.value;
        state.seriesPage = 1;
        loadSeries();
    });
    
    document.getElementById('seriesSort').addEventListener('change', (e) => {
        state.seriesSort = e.target.value;
        state.seriesPage = 1;
        loadSeries();
    });
    
    document.getElementById('prevSeries').addEventListener('click', () => {
        if (state.seriesPage > 1) {
            state.seriesPage--;
            loadSeries();
        }
    });
    
    document.getElementById('nextSeries').addEventListener('click', () => {
        state.seriesPage++;
        loadSeries();
    });
    
    // Router
    window.addEventListener('hashchange', handleRoute);
    
    // Inicializar
    loadGenres();
    loadHome();
    handleRoute();
});
