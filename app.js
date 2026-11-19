/*
   AI helped with: Asynchronous Fetch() API Mashup & Dynamic DOM Rendering
   Prompts:
   1. API Mashup & Randomizer: "Write JavaScript using the Fetch() API and Promise.all() to 
      simultaneously retrieve a random meal from TheMealDB and a random drink from 
      TheCocktailDB, extract up to 20 ingredients and measurements, and render them into 
      #meal-content and #drink-content."
   2. Ingredient Search & Quick-Picks: "Add a search handler and quick-pick chip listeners 
      that filter TheMealDB by main ingredient, look up full recipe details by ID, attempt to 
      match a drink with the same ingredient (falling back to a random drink if none match), 
      and update #status-message."
*/

const mealContent = document.getElementById('meal-content');
const drinkContent = document.getElementById('drink-content');
const statusMessage = document.getElementById('status-message');
const searchForm = document.getElementById('search-form');
const ingredientInput = document.getElementById('ingredient-input');
const randomBtn = document.getElementById('random-btn');

// Extract ingredients & measurements from API object (strIngredient1..20)
function extractIngredients(item) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = item[`strIngredient${i}`];
        const measure = item[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== '') {
            const formatted = measure && measure.trim() !== '' 
                ? `${measure.trim()} ${ingredient.trim()}` 
                : ingredient.trim();
            ingredients.push(formatted);
        }
    }
    return ingredients;
}

// Render Meal HTML
function renderMeal(meal) {
    const ingredients = extractIngredients(meal);
    const ingredientItems = ingredients.map(ing => `<li>${ing}</li>`).join('');

    mealContent.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="dish-img">
        <h2 class="dish-title">${meal.strMeal}</h2>
        <p class="dish-meta">${meal.strArea} Cuisine &bull; ${meal.strCategory}</p>
        <h3 class="section-heading">Ingredients</h3>
        <ul class="ingredient-list">${ingredientItems}</ul>
        <h3 class="section-heading">Preparation</h3>
        <p class="instructions-text">${meal.strInstructions}</p>
    `;
}

// Render Drink HTML
function renderDrink(drink) {
    const ingredients = extractIngredients(drink);
    const ingredientItems = ingredients.map(ing => `<li>${ing}</li>`).join('');

    drinkContent.innerHTML = `
        <img src="${drink.strDrinkThumb}" alt="${drink.strDrink}" class="dish-img">
        <h2 class="dish-title">${drink.strDrink}</h2>
        <p class="dish-meta">${drink.strAlcoholic} &bull; Served in ${drink.strGlass}</p>
        <h3 class="section-heading">Ingredients</h3>
        <ul class="ingredient-list">${ingredientItems}</ul>
        <h3 class="section-heading">Bartender's Notes</h3>
        <p class="instructions-text">${drink.strInstructions}</p>
    `;
}

// Fetch Random Dinner & Drink Mashup
async function fetchRandomPairing() {
    statusMessage.textContent = "Curating tonight's menu...";
    try {
        const [mealRes, drinkRes] = await Promise.all([
            fetch('https://www.themealdb.com/api/json/v1/1/random.php'),
            fetch('https://www.thecocktaildb.com/api/json/v1/1/random.php')
        ]);

        const mealData = await mealRes.json();
        const drinkData = await drinkRes.json();

        renderMeal(mealData.meals[0]);
        renderDrink(drinkData.drinks[0]);
        statusMessage.textContent = "Chef's choice pairing ready!";
    } catch (error) {
        statusMessage.textContent = "Unable to load menu right now. Please try again.";
        console.error(error);
    }
}

// Fetch Pairing by Main Ingredient
async function fetchByIngredient(ingredient) {
    statusMessage.textContent = `Searching pairings featuring "${ingredient}"...`;
    try {
        // 1. Search meals by ingredient
        const mealFilterRes = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`);
        const mealFilterData = await mealFilterRes.json();

        if (!mealFilterData.meals) {
            statusMessage.textContent = `No entrées found with "${ingredient}". Try another ingredient like Chicken, Beef, or Salmon.`;
            return;
        }

        // Pick a random meal from matching results and fetch its full recipe details
        const randomMealSummary = mealFilterData.meals[Math.floor(Math.random() * mealFilterData.meals.length)];
        const fullMealRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${randomMealSummary.idMeal}`);
        const fullMealData = await fullMealRes.json();

        // 2. Try matching a drink with the same ingredient; fallback to a random drink if none exist
        const drinkFilterRes = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`);
        let fullDrink;

        try {
            const drinkFilterData = await drinkFilterRes.json();
            if (drinkFilterData.drinks) {
                const randomDrinkSummary = drinkFilterData.drinks[Math.floor(Math.random() * drinkFilterData.drinks.length)];
                const fullDrinkRes = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${randomDrinkSummary.idDrink}`);
                const fullDrinkData = await fullDrinkRes.json();
                fullDrink = fullDrinkData.drinks[0];
            }
        } catch {
            // CocktailDB returns empty body if ingredient isn't a drink ingredient
        }

        if (!fullDrink) {
            const fallbackDrinkRes = await fetch('https://www.thecocktaildb.com/api/json/v1/1/random.php');
            const fallbackDrinkData = await fallbackDrinkRes.json();
            fullDrink = fallbackDrinkData.drinks[0];
        }

        renderMeal(fullMealData.meals[0]);
        renderDrink(fullDrink);
        statusMessage.textContent = `Paired an entrée featuring ${ingredient} with a complementary drink!`;
    } catch (error) {
        statusMessage.textContent = "Something went wrong while searching. Please try again.";
        console.error(error);
    }
}

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = ingredientInput.value.trim();
    if (query) {
        fetchByIngredient(query);
    }
});

randomBtn.addEventListener('click', () => {
    ingredientInput.value = '';
    fetchRandomPairing();
});

// Quick-pick ingredient chips
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const ingredient = chip.getAttribute('data-ingredient');
        ingredientInput.value = ingredient;
        fetchByIngredient(ingredient);
    });
});

// Load an initial pairing as soon as the page opens
document.addEventListener('DOMContentLoaded', fetchRandomPairing);