const FREE_API_URL = "https://api-free.deepl.com/v2/translate";
const PRO_API_URL = "https://api.deepl.com/v2/translate";

function getApiUrl(apiKey) {
  return apiKey.trim().endsWith(":fx") ? FREE_API_URL : PRO_API_URL;
}

async function translateTexts(texts, { html = false } = {}) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey || !texts.length) return null;

  const body = { text: texts, target_lang: "DE" };
  if (html) {
    body.tag_handling = "html";
    body.tag_handling_version = "v2";
  }

  const response = await fetch(getApiUrl(apiKey), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`DeepL returned ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.translations) || data.translations.length !== texts.length) {
    throw new Error("DeepL returned an incomplete translation.");
  }
  return data.translations.map((item) => item.text);
}

async function translateSearchRecipes(recipes) {
  if (!process.env.DEEPL_API_KEY || !Array.isArray(recipes) || !recipes.length) {
    const status = process.env.DEEPL_API_KEY ? "failed" : "missing-key";
    return (recipes || []).map((recipe) => ({ ...recipe, translationStatus: status }));
  }

  const texts = [...new Set(recipes.flatMap((recipe) => [
    recipe.title,
    ...(recipe.usedIngredients || []).flatMap((item) => [item.name, item.original]),
    ...(recipe.missedIngredients || []).flatMap((item) => [item.name, item.original]),
  ]).filter((text) => typeof text === "string" && text.trim()))];

  try {
    const translated = await translateTexts(texts);
    const dictionary = new Map(texts.map((text, index) => [text, translated[index]]));
    const translateItem = (item) => ({
      ...item,
      ...(item.name ? { name: dictionary.get(item.name) || item.name } : {}),
      ...(item.original ? { original: dictionary.get(item.original) || item.original } : {}),
    });

    return recipes.map((recipe) => ({
      ...recipe,
      title: dictionary.get(recipe.title) || recipe.title,
      usedIngredients: (recipe.usedIngredients || []).map(translateItem),
      missedIngredients: (recipe.missedIngredients || []).map(translateItem),
      unusedIngredients: (recipe.unusedIngredients || []).map(translateItem),
      translationStatus: "translated",
    }));
  } catch (error) {
    console.warn("Recipe search translations are unavailable.", error.message);
    return recipes.map((recipe) => ({ ...recipe, translationStatus: "failed" }));
  }
}

async function translateRecipeDetails(recipe) {
  if (!process.env.DEEPL_API_KEY || !recipe || typeof recipe !== "object") {
    return { ...recipe, translationStatus: process.env.DEEPL_API_KEY ? "failed" : "missing-key" };
  }

  const ingredients = Array.isArray(recipe.extendedIngredients) ? recipe.extendedIngredients : [];
  const instructionSteps = (recipe.analyzedInstructions || [])
    .flatMap((section) => section.steps || [])
    .map((step) => step.step);
  const texts = [...new Set([
    recipe.title,
    ...ingredients.flatMap((item) => [item.original, item.name, item.originalName]),
    ...instructionSteps,
  ].filter((text) => typeof text === "string" && text.trim()))];

  try {
    const translated = await translateTexts(texts);
    const dictionary = new Map(texts.map((text, index) => [text, translated[index]]));
    let instructions = recipe.instructions;
    if (typeof instructions === "string" && instructions.trim()) {
      const [translatedInstructions] = await translateTexts([instructions], { html: true });
      instructions = translatedInstructions;
    }

    return {
      ...recipe,
      title: dictionary.get(recipe.title) || recipe.title,
      extendedIngredients: ingredients.map((item) => ({
        ...item,
        ...(item.original ? { original: dictionary.get(item.original) || item.original } : {}),
        ...(item.name ? { name: dictionary.get(item.name) || item.name } : {}),
        ...(item.originalName ? { originalName: dictionary.get(item.originalName) || item.originalName } : {}),
      })),
      analyzedInstructions: (recipe.analyzedInstructions || []).map((section) => ({
        ...section,
        steps: (section.steps || []).map((step) => ({
          ...step,
          step: dictionary.get(step.step) || step.step,
        })),
      })),
      instructions,
      translationStatus: "translated",
    };
  } catch (error) {
    console.warn("Recipe detail translation is unavailable.", error.message);
    return { ...recipe, translationStatus: "failed" };
  }
}

module.exports = { translateSearchRecipes, translateRecipeDetails };
