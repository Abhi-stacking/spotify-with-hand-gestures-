import { fetchLyrics } from "./lyricsAPI.js";
import { initGestures } from "./gestures.js";
// ===== 0) CONFIG: paste your Spotify token here =====const res = await fetch("http://localhost:PORT/token");
 async function getAccessToken() {
  const res = await fetch("http://localhost:3001/token");
  if (!res.ok) {
    throw new Error("Failed to fetch token");
  }
  const data = await res.json();
  return data.access_token;
}
const player = document.getElementById("player");
// Playlist
const PLAYLIST_ID = "66uwmdohrgXv8xcl8OwJ9o";

// DOM references
const countEl = document.getElementById("song-count");
const orderSelect = document.getElementById("order-select");
const gridEl = document.getElementById("song-grid");
const fullscreenEl = document.getElementById("fullscreen");
const fsImageEl = document.getElementById("fs-image");
const fsTitleEl = document.getElementById("fs-title");
const fsArtistEl = document.getElementById("fs-artist");
const fsCloseBtn = document.getElementById("fs-close");
const lyricsEl = document.getElementById("lyrics");
// State
let songs = [];
let currentIndex = 0;
let lyricsRequestId = 0;

function showSongAt(index) {
  if (!songs.length) return;
  if (index < 0 || index >= songs.length) return;
  currentIndex = index;
  const song = songs[currentIndex];

  openFullscreenWithLyrics(song);

  if (song.audioUrl) {
    player.src = song.audioUrl;
    player.play();
  } else {
    player.pause();
    player.removeAttribute("src");
  }
}



function goToNextSong() {
  if (!songs.length) return;
  const next = (currentIndex + 1) % songs.length;
  showSongAt(next);
}

function goToPrevSong() {
  if (!songs.length) return;
  const prev = (currentIndex - 1 + songs.length) % songs.length;
  showSongAt(prev);
}

async function openFullscreenWithLyrics(song) {
  fsImageEl.src = song.image;
  fsTitleEl.textContent = song.title;
  fsArtistEl.textContent = song.artist;
  fullscreenEl.classList.remove("hidden");

  lyricsEl.textContent = "Loading lyrics...";
  const requestId = ++lyricsRequestId;
  try {
    const lyrics = await fetchLyrics(song.artist, song.title);
    if (requestId !== lyricsRequestId) return;  // ignore if user already changed song
    lyricsEl.textContent = lyrics || "No lyrics found.";
  } catch (e) {
    lyricsEl.textContent = "Error loading lyrics.";
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function applyOrder() {
  const mode = orderSelect.value;

  if (mode === "reverse") {
    songs.reverse();
  } else if (mode === "random") {
    shuffle(songs);
  } else if (mode === "artist-asc") {
    songs.sort((a, b) => a.artist.localeCompare(b.artist));
  } else if (mode === "artist-desc") {
    songs.sort((a, b) => b.artist.localeCompare(a.artist));
  }
}

orderSelect.addEventListener("change", () => {
  applyOrder();
  renderGrid();
});

// UI helpers
function hideFullscreen() {
  fullscreenEl.classList.add("hidden");
  lyricsEl.textContent = "";
}

fsCloseBtn.addEventListener("click", () => {
  hideFullscreen();
});

// Grid rendering
function renderGrid() {
  // clear grid first
  gridEl.innerHTML = "";

  // start from all songs
  let visibleSongs = songs;

  // filter by preview-only if selected
  if (orderSelect.value === "preview-only") {
    visibleSongs = songs.filter((s) => !!s.audioUrl);
  }

  // no songs case
  if (!visibleSongs.length) {
    gridEl.innerHTML =
      '<p style="grid-column: 1 / -1; text-align:center;">No songs loaded.</p>';
    return;
  }

  // create cards
  visibleSongs.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${song.image}" alt="${song.title}" />
      <div class="title">${song.title}</div>
      <div class="artist">${song.artist}</div>
    `;

    card.addEventListener("click", () => {
      const clickedSong = visibleSongs[index];
      if (!clickedSong) return;

      currentIndex = songs.indexOf(clickedSong);
      openFullscreenWithLyrics(clickedSong);

      if (clickedSong.audioUrl) {
        player.src = clickedSong.audioUrl;
        player.play();
      } else {
        player.pause();
        player.removeAttribute("src");
      }
    });

    gridEl.appendChild(card);
  });
}

  
// Spotify load
async function loadFromSpotify(playlistId, token) {
  console.log("loadFromSpotify called with", playlistId);
  try {
    const allItems = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const url =
        "https://api.spotify.com/v1/playlists/" +
        encodeURIComponent(playlistId) +
        "/tracks?limit=" +
        limit +
        "&offset=" +
        offset;

      const res = await fetch(url, {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Spotify error response (offset " + offset + "):", text);
        alert("Error loading playlist. Check token and playlist ID.");
        return;
      }

      const data = await res.json();
      const items = data.items || [];
      allItems.push(...items);

      if (items.length < limit) {
        break;
      }

      offset += limit;
    }

    // build songs array
    songs = allItems
      .filter((item) => item && item.track)
      .map((item, idx) => {
        const t = item.track;
        const title = t.name || "Unknown title";
        const artist =
          (t.artists && t.artists[0] && t.artists[0].name) || "Unknown artist";
        const image =
          (t.album &&
            t.album.images &&
            t.album.images[0] &&
            t.album.images[0].url) ||
          "https://picsum.photos/300?random=" + (200 + idx);
        const audioUrl = t.preview_url || null; // can be null [web:114][web:162]

        return { id: idx + 1, title, artist, image, audioUrl };
      });
window.songs = songs;
    // DEBUG logs go here, after songs is created
    console.log("Songs loaded:", songs.length);
    console.log("First song:", songs[0]);

    applyOrder();
    countEl.textContent = `Songs loaded: ${songs.length}`;
    renderGrid();
  } catch (err) {
    console.error("Failed to load playlist:", err);
    alert("Failed to load playlist. See console for details.");
  }
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, starting init");

  try {
    const token = await getAccessToken();
    console.log("Got token:", token ? token.slice(0, 10) + "..." : "NO TOKEN");

    await loadFromSpotify(PLAYLIST_ID, token);
    console.log("Finished loadFromSpotify");

    await initGestures(
      () => goToNextSong(),
      () => goToPrevSong(),
      () => hideFullscreen()
    );
  } catch (err) {
    console.error("Could not get token:", err);
    alert("Token error. See console.");
    renderGrid();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    goToNextSong();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goToPrevSong();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    hideFullscreen();
  }
});
