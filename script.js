const ingredientForm = document.getElementById("ingredientForm");
const ingredientInput = document.getElementById("ingredientInput");
const ingredientList = document.getElementById("ingredientList");
const suggestionsList = document.getElementById("ingredientSuggestions");
const recipeResults = document.getElementById("recipeResults");
const personalRecipeResults = document.getElementById("personalRecipeResults");
const searchStatus = document.getElementById("searchStatus");
const searchRecipesButton = document.getElementById("searchRecipesButton");
const clearAllBtn = document.getElementById("clearAllBtn");
const recipeForm = document.getElementById("recipeForm");
const recipeModalElement = document.getElementById("recipeModal");
const recipeModal = new bootstrap.Modal(recipeModalElement);
const modalTitle = document.getElementById("modalTitle");
const modalImage = document.getElementById("modalImage");
const modalIngredients = document.getElementById("modalIngredients");
const modalInstructions = document.getElementById("modalInstructions");

const FAVORITES_KEY = "favorites";
const PERSONAL_RECIPES_KEY = "restlosLeckerPersonalRecipes";
let ingredients = [];
let catalogRecipes = [];
let activeSuggestionsIndex = -1;

const ingredientSuggestions = [
  "Tomate", "Käse", "Brot", "Ei", "Milch", "Öl", "Butter", "Salz", "Pfeffer", "Zucker",
  "Mehl", "Reis", "Nudeln", "Zwiebel", "Knoblauch", "Kartoffeln", "Gurke", "Apfel",
  "Banane", "Orange", "Birne", "Trauben", "Zitrone", "Brokkoli", "Spinat", "Pilze",
  "Mais", "Erbsen", "Linsen", "Kichererbsen", "Karotten", "Paprika", "Salat", "Joghurt",
  "Hähnchen", "Fisch", "Schinken", "Hackfleisch", "Zucchini", "Aubergine", "Fetakäse"
];

const aliases = new Map([
  ["tomaten", "tomate"], ["zwiebeln", "zwiebel"], ["kartoffeln", "kartoffel"],
  ["karotten", "karotte"], ["eier", "ei"], ["nudeln", "nudel"], ["linsen", "linse"],
  ["pilze", "pilz"], ["gurken", "gurke"], ["äpfel", "apfel"], ["bananen", "banane"],
  ["paprika", "paprika"], ["öle", "öl"], ["knoblauchzehen", "knoblauch"],
  ["fetakäse", "käse"], ["parmesan", "käse"], ["mozzarella", "käse"]
]);

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getFavorites() {
  return readStoredArray(FAVORITES_KEY);
}

function getPersonalRecipes() {
  return readStoredArray(PERSONAL_RECIPES_KEY);
}

function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    searchStatus.textContent = "Der Browser konnte nicht speichern. Prüfe den verfügbaren Speicherplatz.";
    return false;
  }
}

function updateFavCount() {
  document.getElementById("favCount").textContent = String(getFavorites().length);
}

function normalizeIngredient(value) {
  let name = String(value || "")
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\s*[\d½¼¾.,/]+\s*/, "")
    .replace(/^\s*(g|kg|ml|l|el|tl|prise|prisen|dose|dosen|bund|bund(e|es)|scheibe|scheiben|stueck|stück)\s+/i, "")
    .replace(/[(),.;:]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (name.startsWith("gekochter ")) name = name.slice("gekochter ".length);
  if (name.startsWith("gekochte ")) name = name.slice("gekochte ".length);
  return aliases.get(name) || name;
}

function ingredientNames(recipe) {
  const list = recipe.ingredients || recipe.extendedIngredients || [];
  return list.map((item) => typeof item === "string" ? item : (item.name || item.original || ""));
}

function getMatch(recipe, selected) {
  if (recipe.sourceType === "spoonacular") {
    const used = Number(recipe.usedIngredientCount) || 0;
    const missing = Number(recipe.missedIngredientCount) || 0;
    return {
      used,
      total: used + missing,
      missing: (recipe.missedIngredients || []).map((item) => item.name || item.original || "")
    };
  }

  const chosen = new Set(selected.map(normalizeIngredient));
  const names = ingredientNames(recipe);
  const found = names.filter((name) => {
    const normalized = normalizeIngredient(name);
    return [...chosen].some((choice) => choice && (normalized === choice || normalized.includes(choice) || choice.includes(normalized)));
  });
  return {
    used: found.length,
    total: names.length,
    missing: names.filter((name) => !found.includes(name))
  };
}

function updateIngredientList() {
  ingredientList.replaceChildren();
  clearAllBtn.hidden = ingredients.length === 0;

  ingredients.forEach((ingredient, index) => {
    const item = document.createElement("li");
    item.className = "list-group-item d-flex justify-content-between align-items-center";
    const label = document.createElement("span");
    label.textContent = ingredient;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-sm btn-outline-danger";
    remove.setAttribute("aria-label", `${ingredient} entfernen`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      ingredients.splice(index, 1);
      updateIngredientList();
    });
    item.append(label, remove);
    ingredientList.append(item);
  });
}

function addIngredient(value) {
  const ingredient = String(value || "").trim().toLocaleLowerCase("de-DE");
  if (!ingredient) return;
  if (ingredients.some((item) => normalizeIngredient(item) === normalizeIngredient(ingredient))) {
    searchStatus.textContent = "Diese Zutat ist schon in deiner Liste.";
    return;
  }
  ingredients.push(ingredient);
  updateIngredientList();
  ingredientInput.value = "";
  suggestionsList.replaceChildren();
  ingredientInput.focus();
}

ingredientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addIngredient(ingredientInput.value);
});

ingredientInput.addEventListener("input", () => {
  const value = ingredientInput.value.toLocaleLowerCase("de-DE").trim();
  suggestionsList.replaceChildren();
  activeSuggestionsIndex = -1;
  if (value.length < 2) return;

  ingredientSuggestions
    .filter((item) => item.toLocaleLowerCase("de-DE").startsWith(value))
    .slice(0, 8)
    .forEach((match) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "list-group-item list-group-item-action";
      option.textContent = match;
      option.addEventListener("click", () => addIngredient(match));
      suggestionsList.append(option);
    });
});

ingredientInput.addEventListener("keydown", (event) => {
  const items = [...suggestionsList.querySelectorAll("button")];
  if (!items.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    activeSuggestionsIndex = (activeSuggestionsIndex + direction + items.length) % items.length;
    items.forEach((item, index) => item.classList.toggle("active", index === activeSuggestionsIndex));
  } else if (event.key === "Enter" && activeSuggestionsIndex >= 0) {
    event.preventDefault();
    items[activeSuggestionsIndex].click();
  }
});

clearAllBtn.addEventListener("click", () => {
  ingredients = [];
  document.querySelectorAll(".form-check-input").forEach((checkbox) => { checkbox.checked = false; });
  updateIngredientList();
  recipeResults.replaceChildren();
  searchStatus.textContent = "Zutaten gelöscht. Füge neue Zutaten hinzu und starte die Suche.";
});

function selectedIngredients() {
  const pantry = [...document.querySelectorAll(".form-check-input:checked")].map((box) => box.value);
  return [...new Set([...ingredients, ...pantry].map((item) => item.trim()).filter(Boolean))];
}

async function loadCatalog() {
  try {
    const response = await fetch("/recipes.json");
    if (!response.ok) throw new Error("Die eigene Rezeptsammlung konnte nicht geladen werden.");
    catalogRecipes = await response.json();
    renderPersonalRecipes();
  } catch (error) {
    console.error(error);
    searchStatus.textContent = "Die eigene Rezeptsammlung ist gerade nicht verfügbar.";
  }
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function makeRecipeCard(recipe, selected = [], { personal = false, showMatch = true } = {}) {
  const column = document.createElement("div");
  column.className = "col";
  const card = document.createElement("article");
  card.className = "card h-100 recipe-card";

  const imageUrl = safeImageUrl(recipe.image);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = recipe.title ? `Gericht: ${recipe.title}` : "Rezeptbild";
    image.className = "card-img-top";
    image.loading = "lazy";
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "recipe-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "🍲";
    card.append(placeholder);
  }

  const body = document.createElement("div");
  body.className = "card-body d-flex flex-column";
  const title = document.createElement("h3");
  title.className = "h5 card-title";
  title.textContent = recipe.title || "Rezept ohne Titel";
  body.append(title);

  const match = getMatch(recipe, selected);
  if (showMatch) {
    const summary = document.createElement("p");
    summary.className = "ingredient-summary mb-2";
    summary.textContent = `${match.used} von ${match.total} Zutaten vorhanden`;
    body.append(summary);

    if (match.missing.length) {
      const missing = document.createElement("p");
      missing.className = "small text-muted";
      missing.textContent = `Noch nötig: ${match.missing.join(", ")}`;
      body.append(missing);
    }
  }
  const meta = document.createElement("p");
  meta.className = "small text-muted mt-auto";
  const minutes = Number(recipe.readyInMinutes);
  meta.textContent = [recipe.source || "Rezept", minutes > 0 ? `${minutes} Min.` : "", recipe.servings ? `${recipe.servings} Portionen` : ""].filter(Boolean).join(" · ");
  body.append(meta);

  const actions = document.createElement("div");
  actions.className = "d-flex gap-2 flex-wrap";
  const details = document.createElement("button");
  details.type = "button";
  details.className = "btn btn-primary btn-action btn-sm";
  details.textContent = "Details ansehen";
  details.addEventListener("click", () => showRecipeDetails(recipe));
  actions.append(details);

  if (!personal) {
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = `btn btn-sm ${getFavorites().some((item) => item.id === recipe.id) ? "btn-danger" : "btn-outline-danger"}`;
    favorite.textContent = "♥";
    favorite.setAttribute("aria-label", "Rezept als Favorit merken");
    favorite.addEventListener("click", () => toggleFavorite(recipe));
    actions.append(favorite);
  } else {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-outline-danger btn-sm";
    remove.textContent = "Aus Sammlung entfernen";
    remove.addEventListener("click", () => deletePersonalRecipe(recipe.id));
    actions.append(remove);
  }
  body.append(actions);
  card.append(body);
  column.append(card);
  return column;
}

function displayRecipes(recipes, selected) {
  recipeResults.replaceChildren();
  if (!recipes.length) {
    searchStatus.textContent = "Keine passenden Rezepte gefunden. Probiere weitere Zutaten oder hebe den Zeitfilter auf.";
    return;
  }
  recipes.forEach((recipe) => recipeResults.append(makeRecipeCard(recipe, selected)));
  searchStatus.textContent = `${recipes.length} passende Rezepte – aus deiner Sammlung und der Rezept-API.`;
}

async function searchRecipes() {
  const selected = selectedIngredients();
  if (!selected.length) {
    searchStatus.textContent = "Bitte füge mindestens eine Zutat hinzu oder wähle eine Grundzutat aus.";
    ingredientInput.focus();
    return;
  }

  searchRecipesButton.disabled = true;
  searchRecipesButton.textContent = "Suche läuft …";
  searchStatus.textContent = "Wir suchen passende Rezepte …";
  recipeResults.replaceChildren();

  const time = Number(document.getElementById("timeFilter").value) || 0;
  const ownMatches = [...catalogRecipes, ...getPersonalRecipes()]
    .map((recipe) => ({ ...recipe, sourceType: recipe.sourceType || "own" }))
    .filter((recipe) => !time || !recipe.readyInMinutes || Number(recipe.readyInMinutes) <= time)
    .filter((recipe) => getMatch(recipe, selected).used > 0)
    .map((recipe) => ({ recipe, match: getMatch(recipe, selected) }))
    .sort((a, b) => (b.match.used / Math.max(1, b.match.total)) - (a.match.used / Math.max(1, a.match.total)) || b.match.used - a.match.used)
    .map(({ recipe }) => recipe);

  const base = [...document.querySelectorAll(".form-check-input:checked")].map((box) => box.value);
  const typed = ingredients;
  const query = [...new Set([...typed, ...base])];
  const timeValue = document.getElementById("timeFilter").value;
  let externalMatches = [];
  let externalFailure = "";

  try {
    const params = new URLSearchParams({ ingredients: query.join(",") });
    if (timeValue !== "0") params.set("maxReadyTime", timeValue);
    const response = await fetch(`/api/recipes?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Die externe Rezeptsuche ist gerade nicht verfügbar.");
    externalMatches = Array.isArray(data) ? data.map((recipe) => ({ ...recipe, source: "Rezept-API · Originalsprache", sourceType: "spoonacular" })) : [];
  } catch (error) {
    console.warn(error);
    externalFailure = error.message;
  } finally {
    const seen = new Set(ownMatches.map((recipe) => recipe.title.toLocaleLowerCase("de-DE")));
    const uniqueExternal = externalMatches.filter((recipe) => {
      const key = (recipe.title || "").toLocaleLowerCase("de-DE");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    displayRecipes([...ownMatches, ...uniqueExternal], selected);
    if (externalFailure) {
      searchStatus.textContent = `${externalFailure} ${ownMatches.length ? "Deine eigene Sammlung wird trotzdem angezeigt." : "Prüfe die API-Konfiguration."}`;
    } else if (!externalMatches.length && ownMatches.length) {
      searchStatus.textContent = `${ownMatches.length} passende Rezepte aus deiner Sammlung. Die externe Quelle lieferte keine Treffer.`;
    } else if (!externalMatches.length && !ownMatches.length) {
      searchStatus.textContent = "Keine passenden Rezepte gefunden. Probiere weitere Zutaten oder hebe den Zeitfilter auf.";
    }
    searchRecipesButton.disabled = false;
    searchRecipesButton.textContent = "Los geht’s 🍽️";
  }
}

searchRecipesButton.addEventListener("click", searchRecipes);

function toggleFavorite(recipe) {
  const favorites = getFavorites();
  const exists = favorites.some((item) => item.id === recipe.id);
  const next = exists ? favorites.filter((item) => item.id !== recipe.id) : [...favorites, recipe];
  if (saveArray(FAVORITES_KEY, next)) {
    updateFavCount();
    searchStatus.textContent = exists ? "Favorit entfernt." : "Rezept gespeichert.";
  }
}

function showFavorites() {
  const favorites = getFavorites();
  recipeResults.replaceChildren();
  if (!favorites.length) {
    searchStatus.textContent = "Noch keine Favoriten gespeichert.";
    return;
  }
  favorites.forEach((recipe) => recipeResults.append(makeRecipeCard(recipe, [], { showMatch: false })));
  searchStatus.textContent = `${favorites.length} gespeicherte Favoriten.`;
  recipeResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

function appendSafeMarkup(parent, rawHtml) {
  const parsed = new DOMParser().parseFromString(String(rawHtml || ""), "text/html");
  const allowed = new Set(["P", "OL", "UL", "LI", "BR", "STRONG", "B", "EM", "I"]);
  const copyNode = (node, target) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.append(document.createTextNode(node.textContent || ""));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (!allowed.has(node.tagName)) {
      [...node.childNodes].forEach((child) => copyNode(child, target));
      return;
    }
    const clean = document.createElement(node.tagName.toLowerCase());
    [...node.childNodes].forEach((child) => copyNode(child, clean));
    target.append(clean);
  };
  [...parsed.body.childNodes].forEach((node) => copyNode(node, parent));
}

async function showRecipeDetails(recipe) {
  modalTitle.textContent = recipe.title || "Rezeptdetails";
  modalImage.hidden = true;
  modalImage.removeAttribute("src");
  modalIngredients.replaceChildren();
  modalInstructions.replaceChildren();
  const knownIngredients = ingredientNames(recipe);
  knownIngredients.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    modalIngredients.append(li);
  });
  if (recipe.instructions) {
    recipe.instructions.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      modalInstructions.append(p);
    });
  } else {
    modalInstructions.textContent = "Lade die Zubereitung …";
  }

  const imageUrl = safeImageUrl(recipe.image);
  if (imageUrl) {
    modalImage.src = imageUrl;
    modalImage.alt = `Gericht: ${recipe.title || "Rezept"}`;
    modalImage.hidden = false;
  }
  recipeModal.show();

  if (recipe.sourceType !== "spoonacular") return;
  try {
    const response = await fetch(`/api/recipes?id=${encodeURIComponent(recipe.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Details nicht verfügbar.");
    modalIngredients.replaceChildren();
    (data.extendedIngredients || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.original || item.name || "";
      modalIngredients.append(li);
    });
    modalInstructions.replaceChildren();
    if (data.instructions) appendSafeMarkup(modalInstructions, data.instructions);
    else modalInstructions.textContent = "Für dieses Rezept ist keine Zubereitung verfügbar.";
  } catch (error) {
    modalInstructions.textContent = error.message;
  }
}

function renderPersonalRecipes() {
  personalRecipeResults.replaceChildren();
  const recipes = getPersonalRecipes();
  if (!recipes.length) {
    const message = document.createElement("p");
    message.className = "text-muted";
    message.textContent = "Hier erscheinen deine selbst gespeicherten Rezepte.";
    personalRecipeResults.append(message);
    return;
  }
  recipes.forEach((recipe) => personalRecipeResults.append(makeRecipeCard(recipe, [], { personal: true })));
}

function deletePersonalRecipe(id) {
  const recipes = getPersonalRecipes().filter((recipe) => recipe.id !== id);
  if (saveArray(PERSONAL_RECIPES_KEY, recipes)) renderPersonalRecipes();
}

recipeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("recipeTitleInput").value.trim();
  const ingredientsText = document.getElementById("recipeIngredientsInput").value;
  const instructionsText = document.getElementById("recipeInstructionsInput").value;
  const recipeIngredients = ingredientsText.split(/\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 40);
  const instructions = instructionsText.split(/\n+/).map((item) => item.trim()).filter(Boolean).slice(0, 40);
  if (!title || !recipeIngredients.length || !instructions.length) return;

  const personal = getPersonalRecipes();
  personal.unshift({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    ingredients: recipeIngredients,
    instructions,
    readyInMinutes: Number(document.getElementById("recipeTimeInput").value) || null,
    servings: Number(document.getElementById("recipeServingsInput").value) || null,
    source: "Dein Rezept",
    sourceType: "own"
  });
  if (saveArray(PERSONAL_RECIPES_KEY, personal)) {
    recipeForm.reset();
    renderPersonalRecipes();
    searchStatus.textContent = "Dein Rezept wurde auf diesem Gerät gespeichert.";
  }
});

document.querySelector(".favorites-bar button").addEventListener("click", showFavorites);
updateFavCount();
loadCatalog();
