const SPOONACULAR_BASE = "https://api.spoonacular.com/recipes";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Nur GET-Anfragen sind erlaubt." });
  }

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Die externe Rezeptsuche ist noch nicht eingerichtet." });
  }

  const { id, ingredients, maxReadyTime } = req.query || {};
  const recipeId = Array.isArray(id) ? id[0] : id;

  if (recipeId) {
    if (!/^\d{1,12}$/.test(recipeId)) {
      return res.status(400).json({ error: "Ungültige Rezept-ID." });
    }
    return proxyRequest(`/${recipeId}/information`, new URLSearchParams(), apiKey, res);
  }

  const rawIngredients = Array.isArray(ingredients) ? ingredients.join(",") : (ingredients || "");
  const selectedIngredients = rawIngredients
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 80)
    .slice(0, 15);

  if (selectedIngredients.length === 0) {
    return res.status(400).json({ error: "Bitte gib mindestens eine Zutat an." });
  }

  const params = new URLSearchParams({
    ingredients: selectedIngredients.join(","),
    number: "12",
    ranking: "1",
    ignorePantry: "true",
  });

  const time = Number(Array.isArray(maxReadyTime) ? maxReadyTime[0] : maxReadyTime);
  if (Number.isFinite(time) && time > 0) {
    params.set("maxReadyTime", String(Math.min(600, Math.floor(time))));
  }

  return proxyRequest("/findByIngredients", params, apiKey, res);
};

async function proxyRequest(path, params, apiKey, res) {
  try {
    const query = params.toString();
    const url = `${SPOONACULAR_BASE}${path}${query ? `?${query}` : ""}`;
    const response = await fetch(url, { headers: { "x-api-key": apiKey } });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: "Ungültige Antwort der Rezeptquelle." };
    }

    if (!response.ok) {
      const status = response.status === 402 || response.status === 429 ? 503 : 502;
      return res.status(status).json({ error: status === 503
        ? "Die Rezeptsuche ist gerade ausgelastet. Bitte versuche es später erneut."
        : "Die Rezeptquelle ist momentan nicht erreichbar." });
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({ error: "Die Rezeptquelle ist momentan nicht erreichbar." });
  }
}
