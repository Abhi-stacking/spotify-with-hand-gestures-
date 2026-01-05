import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const CLIENT_ID = " "; // put yours
const CLIENT_SECRET = " "; // put yours
const GENIUS_TOKEN = " "; // put yours

const app = express();
app.use(cors());

// 1) SPOTIFY TOKEN ROUTE (must exist)
app.get("/token", async (req, res) => {
  try {
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("client_id", CLIENT_ID);
    body.append("client_secret", CLIENT_SECRET);

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Spotify token error:", text);
      return res.status(500).json({ error: "Failed to get token" });
    }

    const data = await response.json();
    res.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Token server failed:", err);
    res.status(500).json({ error: "Token server error" });
  }
});

// 2) GENIUS SEARCH ROUTE (optional)
app.get("/genius-search", async (req, res) => {
  const { artist, title } = req.query;
  if (!artist || !title) {
    return res.status(400).json({ error: "Missing artist or title" });
  }

  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const response = await fetch(
      "https://api.genius.com/search?q=" + query,
      {
        headers: {
          Authorization: `Bearer ${GENIUS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Genius API error:", text);
      return res.status(500).json({ error: "Genius API error" });
    }

    const data = await response.json();
    const hits = data.response && data.response.hits;
    if (!hits || !hits.length) {
      return res.status(404).json({ error: "No Genius result" });
    }

    const url = hits[0].result && hits[0].result.url;
    if (!url) {
      return res.status(404).json({ error: "No Genius URL" });
    }

    res.json({ url });
  } catch (err) {
    console.error("Genius search server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/genius-lyrics", async (req, res) => {
  const { artist, title } = req.query;
  if (!artist || !title) {
    return res.status(400).json({ lyrics: "", error: "Missing artist or title" });
  }

  try {
    // 1) Reuse Genius API search to get song URL
    const query = encodeURIComponent(`${artist} ${title}`);
    const searchResponse = await fetch(
      "https://api.genius.com/search?q=" + query,
      {
        headers: {
          Authorization: `Bearer ${GENIUS_TOKEN}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const text = await searchResponse.text();
      console.error("Genius API error (lyrics):", text);
      return res.status(500).json({ lyrics: "", error: "Genius API error" });
    }

    const searchData = await searchResponse.json();
    const hits = searchData.response && searchData.response.hits;
    if (!hits || !hits.length) {
      return res.status(404).json({ lyrics: "", error: "No Genius result" });
    }

    const songUrl = hits[0].result && hits[0].result.url;
    if (!songUrl) {
      return res.status(404).json({ lyrics: "", error: "No Genius URL" });
    }

    // 2) Scrape lyrics from songUrl
    const pageResponse = await axios.get(songUrl);
    const $ = cheerio.load(pageResponse.data);
    const lyricsContainer = $('[data-lyrics-container="true"]');

    $("br", lyricsContainer).replaceWith("\n");
    $("a", lyricsContainer).replaceWith((_i, el) => $(el).text());
    lyricsContainer.children().remove();

    const lyrics = lyricsContainer.text().trim();
    return res.json({ lyrics });
  } catch (err) {
    console.error("Genius lyrics server error:", err);
    return res.status(500).json({ lyrics: "", error: "Could not get lyrics" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Spotify token server running at http://localhost:${PORT}/token`);
});
