import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Simple fallback mock foods in case the Open Food Facts API is slow or offline
const MOCK_FOODS = [
  { id: 'mock-1', name: 'Organic Banana', brand: 'Chiquita', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, serving_size: 100, serving_unit: 'g' },
  { id: 'mock-2', name: 'Chicken Breast (Cooked)', brand: 'Tyson', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: 100, serving_unit: 'g' },
  { id: 'mock-3', name: 'Greek Yogurt (Plain 0%)', brand: 'Chobani', calories: 59, protein: 10.3, carbs: 3.6, fat: 0.4, serving_size: 100, serving_unit: 'g' },
  { id: 'mock-4', name: 'Almond Milk (Unsweetened)', brand: 'Blue Diamond', calories: 15, protein: 0.4, carbs: 0.4, fat: 1.2, serving_size: 100, serving_unit: 'ml' },
  { id: 'mock-5', name: 'Peanut Butter', brand: 'Jif', calories: 588, protein: 25, carbs: 20, fat: 50, serving_size: 100, serving_unit: 'g' },
  { id: 'mock-6', name: 'White Rice (Cooked)', brand: 'Uncle Ben\'s', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving_size: 100, serving_unit: 'g' },
  { id: 'mock-7', name: 'Whole Large Egg', brand: 'Local Farm', calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, serving_size: 100, serving_unit: 'g' },
];

function parseServing(servingStr: string | undefined): { size: number; unit: string } {
  let size = 100;
  let unit = 'g';

  if (!servingStr) return { size, unit };

  // Try to match standard format e.g., "30 g", "100 ml", "1.5 oz", etc.
  const match = servingStr.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|piece|scoop|cookie|cup|serving|sachet|slice|tbsp|tsp)/i);
  if (match) {
    size = parseFloat(match[1]);
    unit = match[2].toLowerCase();
  } else {
    // If no unit matched, look for any number
    const numMatch = servingStr.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      size = parseFloat(numMatch[1]);
    }
    // Clean non-alphanumeric chars for the unit, fallback to 'g'
    const cleanedUnit = servingStr.replace(/[\d\s.\(\)-]/g, '').trim();
    unit = cleanedUnit || 'g';
  }

  return { size, unit };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim() === '') {
      return NextResponse.json([]);
    }

    // Call Open Food Facts search API
    // We request page size of 24 for quick response and density
    const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=24`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    let products: any[] = [];
    try {
      const response = await fetch(offUrl, {
        headers: {
          'User-Agent': 'MobileFoodTracker - Web - Version 1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        products = data.products || [];
      }
    } catch (fetchErr) {
      console.error('External search API fetch error or timeout:', fetchErr);
    }

    // Map and normalize Open Food Facts products
    let results = products.map((p: any) => {
      const nutriments = p.nutriments || {};
      
      // Get calories: first try energy-kcal (per 100g is standard in OFF), then per serving, then generic energy
      let calories = 0;
      if (typeof nutriments['energy-kcal_100g'] === 'number') {
        calories = nutriments['energy-kcal_100g'];
      } else if (typeof nutriments['energy-kcal'] === 'number') {
        calories = nutriments['energy-kcal'];
      } else if (typeof nutriments['energy-kcal_serving'] === 'number') {
        calories = nutriments['energy-kcal_serving'];
      } else if (typeof nutriments['energy-kj_100g'] === 'number') {
        calories = Math.round(nutriments['energy-kj_100g'] / 4.184); // Convert kJ to kcal
      }

      const protein = nutriments.proteins_100g ?? nutriments.proteins ?? 0;
      const carbs = nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0;
      const fat = nutriments.fat_100g ?? nutriments.fat ?? 0;

      const servingInfo = parseServing(p.serving_size);

      return {
        id: p.code || p.id || Math.random().toString(),
        name: p.product_name || p.product_name_en || 'Unknown Food',
        brand: p.brands || p.brand || '',
        calories: Number(Number(calories).toFixed(1)),
        protein: Number(Number(protein).toFixed(1)),
        carbs: Number(Number(carbs).toFixed(1)),
        fat: Number(Number(fat).toFixed(1)),
        serving_size: servingInfo.size,
        serving_unit: servingInfo.unit,
      };
    });

    // Merge with matching mock fallback items if search query matches mock names
    const lowerQuery = query.toLowerCase();
    const matchedMocks = MOCK_FOODS.filter(
      (m) => m.name.toLowerCase().includes(lowerQuery) || m.brand.toLowerCase().includes(lowerQuery)
    );

    // Merge results, prioritizing external API results
    results = [...results, ...matchedMocks];

    // Deduplicate results by name + brand
    const seen = new Set<string>();
    const dedupedResults = results.filter((item) => {
      const key = `${item.name.toLowerCase()}|${item.brand.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return NextResponse.json(dedupedResults);
  } catch (error: any) {
    console.error('Error in food search API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
