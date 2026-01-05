const BACKEND_BASE = " "; // put yours
export async function fetchLyrics(artist, title) {
  const params = new URLSearchParams({ artist, title });
  const res = await fetch(`${BACKEND_BASE}/genius-lyrics?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Failed to fetch lyrics");
  }

  const data = await res.json(); // { lyrics: "..." }
  return data.lyrics;
}
