import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Test database barcodes mapping (corresponds to seeded foods in schema.sql)
const TEST_BARCODES: Record<string, any> = {
  '0000000000001': { id: 'c0000000-0000-0000-0000-000000000001', name: '[TEST] Egg (Large)', brand: 'Seeded Farms', calories: 70, protein: 6, carbs: 0.6, fat: 5, serving_size: 50, serving_unit: 'g' },
  '0000000000002': { id: 'c0000000-0000-0000-0000-000000000002', name: '[TEST] Grilled Chicken Breast', brand: 'Seeded Farms', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: 100, serving_unit: 'g' },
  '0000000000003': { id: 'c0000000-0000-0000-0000-000000000003', name: '[TEST] Brown Rice (Cooked)', brand: 'Seeded Farms', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, serving_size: 100, serving_unit: 'g' },
  '0000000000004': { id: 'c0000000-0000-0000-0000-000000000004', name: '[TEST] Whey Protein Powder', brand: 'Seeded Nutrition', calories: 120, protein: 24, carbs: 3, fat: 1.5, serving_size: 30, serving_unit: 'g' },
  '0000000000005': { id: 'c0000000-0000-0000-0000-000000000005', name: '[TEST] Peanut Butter (Creamy)', brand: 'Seeded Farms', calories: 188, protein: 8, carbs: 6, fat: 16, serving_size: 32, serving_unit: 'g' },
  '0000000000006': { id: 'c0000000-0000-0000-0000-000000000006', name: '[TEST] Rolled Oats', brand: 'Seeded Farms', calories: 150, protein: 5, carbs: 27, fat: 2.5, serving_size: 40, serving_unit: 'g' },
  '0000000000007': { id: 'c0000000-0000-0000-0000-000000000007', name: '[TEST] Banana (Medium)', brand: 'Fresh Fruit', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, serving_size: 118, serving_unit: 'g' },
};

function parseServing(servingStr: string | undefined): { size: number; unit: string } {
  let size = 100;
  let unit = 'g';

  if (!servingStr) return { size, unit };

  const match = servingStr.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|piece|scoop|cookie|cup|serving|sachet|slice|tbsp|tsp)/i);
  if (match) {
    size = parseFloat(match[1]);
    unit = match[2].toLowerCase();
  } else {
    const numMatch = servingStr.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      size = parseFloat(numMatch[1]);
    }
    const cleanedUnit = servingStr.replace(/[\d\s.\(\)-]/g, '').trim();
    unit = cleanedUnit || 'g';
  }

  return { size, unit };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing barcode code parameter' }, { status: 400 });
    }

    // 1. Check if barcode is one of our seeded TEST barcodes
    if (TEST_BARCODES[code]) {
      return NextResponse.json(TEST_BARCODES[code]);
    }

    // 2. Fetch from Open Food Facts API
    const offUrl = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    let product: any = null;
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
        // status 1 = found, status 0 = not found
        if (data.status === 1 || data.status_verbose === 'product found') {
          product = data.product;
        }
      }
    } catch (fetchErr) {
      console.error('Barcode API fetch error or timeout:', fetchErr);
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 3. Map nutrition data
    const nutriments = product.nutriments || {};
    let calories = 0;
    if (typeof nutriments['energy-kcal_100g'] === 'number') {
      calories = nutriments['energy-kcal_100g'];
    } else if (typeof nutriments['energy-kcal'] === 'number') {
      calories = nutriments['energy-kcal'];
    } else if (typeof nutriments['energy-kcal_serving'] === 'number') {
      calories = nutriments['energy-kcal_serving'];
    } else if (typeof nutriments['energy-kj_100g'] === 'number') {
      calories = Math.round(nutriments['energy-kj_100g'] / 4.184);
    }

    const protein = nutriments.proteins_100g ?? nutriments.proteins ?? 0;
    const carbs = nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0;
    const fat = nutriments.fat_100g ?? nutriments.fat ?? 0;

    const servingInfo = parseServing(product.serving_size);

    const mappedProduct = {
      id: product.code || code,
      name: product.product_name || product.product_name_en || 'Unknown Food',
      brand: product.brands || product.brand || '',
      calories: Number(Number(calories).toFixed(1)),
      protein: Number(Number(protein).toFixed(1)),
      carbs: Number(Number(carbs).toFixed(1)),
      fat: Number(Number(fat).toFixed(1)),
      serving_size: servingInfo.size,
      serving_unit: servingInfo.unit,
    };

    return NextResponse.json(mappedProduct);
  } catch (error) {
    console.error('Error in barcode API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
