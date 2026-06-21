'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, CustomFood } from '../lib/db';
import { X, Search, ScanBarcode, ChevronLeft, Plus, Check, Loader2, Sparkles, ChevronRight, Apple, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface SearchOverlayProps {
  onClose: () => void;
  onAddFood: (food: {
    food_name: string;
    serving_quantity: number;
    serving_unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
  mealSlot: string;
}

export default function SearchOverlay({ onClose, onAddFood, mealSlot }: SearchOverlayProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'custom'>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [loading, setLoading] = useState(false);

  // Portion Modal state
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Custom Food Wizard state
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardName, setWizardName] = useState('');
  const [wizardBrand, setWizardBrand] = useState('');
  const [wizardBarcode, setWizardBarcode] = useState('');
  const [wizardServingSize, setWizardServingSize] = useState('100');
  const [wizardServingUnit, setWizardServingUnit] = useState('g');
  const [wizardCalories, setWizardCalories] = useState('');
  const [wizardProtein, setWizardProtein] = useState('');
  const [wizardCarbs, setWizardCarbs] = useState('');
  const [wizardFat, setWizardFat] = useState('');

  // Barcode Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanningError, setScanningError] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch custom foods
  useEffect(() => {
    const fetchCustom = async () => {
      const data = await db.getCustomFoods();
      setCustomFoods(data);
    };
    fetchCustom();
  }, [showCreateWizard]);

  // Execute global search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setGlobalResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setGlobalResults(data);
        }
      } catch (err) {
        console.error('Failed to search food:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'global') {
      performSearch();
    }
  }, [debouncedQuery, activeTab]);

  // Barcode Lookup trigger
  const lookupBarcode = async (barcode: string) => {
    setScannerLoading(true);
    setScanningError(null);
    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const data = await res.json();
        // Automatically close scanner and open portion editor for found item
        stopScanner();
        setShowScanner(false);
        setSelectedFood(data);
        setQuantity(1);
      } else {
        setScanningError(`Product not found for barcode: ${barcode}. Try creating a custom food!`);
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err);
      setScanningError('Network error looking up barcode.');
    } finally {
      setScannerLoading(false);
    }
  };

  // Start Barcode Scanner
  const startScanner = async () => {
    setScanningError(null);
    setScannerLoading(true);
    try {
      // Small timeout to allow element to mount
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode('qr-reader');
          html5QrcodeRef.current = scanner;

          await scanner.start(
            { facingMode: 'environment' },
            {
              fps: 12,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size * 0.6 };
              },
            },
            (decodedText) => {
              // Successfully decoded a QR/Barcode code
              lookupBarcode(decodedText);
            },
            () => {
              // Ignore failure callbacks frame-by-frame
            }
          );
          setScannerLoading(false);
        } catch (err: any) {
          console.error('Failed to start scanner camera:', err);
          setScanningError('Failed to access camera. Check browser permissions.');
          setScannerLoading(false);
        }
      }, 300);
    } catch (err) {
      console.error(err);
      setScannerLoading(false);
    }
  };

  // Stop scanner camera
  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current = null;
      } catch (err) {
        console.error('Failed to stop camera:', err);
      }
    }
  };

  useEffect(() => {
    if (showScanner) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [showScanner]);

  // Log item to tracker
  const handleLogFood = () => {
    if (!selectedFood) return;

    onAddFood({
      food_name: selectedFood.name,
      serving_quantity: quantity,
      serving_unit: `${selectedFood.serving_size}${selectedFood.serving_unit}`,
      calories: Number((selectedFood.calories * quantity).toFixed(1)),
      protein: Number((selectedFood.protein * quantity).toFixed(1)),
      carbs: Number((selectedFood.carbs * quantity).toFixed(1)),
      fat: Number((selectedFood.fat * quantity).toFixed(1)),
    });

    setSelectedFood(null);
    onClose();
  };

  // Create custom food
  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardName || !wizardServingSize || !wizardCalories) return;

    const newFood: Omit<CustomFood, 'id' | 'user_id'> = {
      name: wizardName,
      brand: wizardBrand || undefined,
      barcode: wizardBarcode || undefined,
      serving_size: parseFloat(wizardServingSize),
      serving_unit: wizardServingUnit,
      calories: parseFloat(wizardCalories),
      protein: parseFloat(wizardProtein || '0'),
      carbs: parseFloat(wizardCarbs || '0'),
      fat: parseFloat(wizardFat || '0'),
    };

    const saved = await db.addCustomFood(newFood);
    if (saved) {
      // Clear forms
      setWizardName('');
      setWizardBrand('');
      setWizardBarcode('');
      setWizardCalories('');
      setWizardProtein('');
      setWizardCarbs('');
      setWizardFat('');
      setShowCreateWizard(false);
      
      // Auto open portion editor for the newly created food
      setSelectedFood(saved);
      setQuantity(1);
    }
  };

  // Filter custom foods locally by query
  const filteredCustomFoods = customFoods.filter(
    (food) =>
      food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (food.brand && food.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-950 z-40 flex flex-col max-w-md mx-auto h-full border-x border-dark-border shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-dark-border flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h3 className="font-bold text-slate-100 text-sm">Add to {mealSlot}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-950 p-2 border-b border-dark-border shrink-0">
        <div className="flex w-full bg-slate-900 p-0.5 rounded-xl border border-dark-border/40">
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'global' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
            }`}
          >
            Global Search
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'custom' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
            }`}
          >
            My Custom Foods
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 bg-slate-950 flex gap-2 items-center shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === 'global' ? 'Search brand, generic name...' : 'Search custom foods...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-dark-border focus:border-emerald-500/80 rounded-xl py-3 pl-10 pr-10 text-xs text-slate-200 outline-none transition"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
          >
            <ScanBarcode className="w-5 h-5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Results View */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-slate-400 text-xs">Querying database...</span>
          </div>
        ) : activeTab === 'global' ? (
          <>
            {/* Global Search Results */}
            {globalResults.length > 0 ? (
              <div className="divide-y divide-dark-border/40">
                {globalResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => {
                      setSelectedFood(food);
                      setQuantity(1);
                    }}
                    className="w-full py-3.5 text-left flex justify-between items-center group cursor-pointer"
                  >
                    <div className="space-y-0.5 max-w-[75%]">
                      <p className="font-semibold text-xs text-slate-200 truncate group-active:text-emerald-400">
                        {food.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {food.brand ? `${food.brand} • ` : ''}Serving: {food.serving_size}{food.serving_unit}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-200">{Math.round(food.calories)} kcal</p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              debouncedQuery && (
                <div className="py-16 text-center space-y-4">
                  <Apple className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-xs">No food matched "{debouncedQuery}" in databases.</p>
                  <button
                    onClick={() => {
                      setWizardName(debouncedQuery);
                      setShowCreateWizard(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Custom Food</span>
                  </button>
                </div>
              )
            )}
          </>
        ) : (
          <>
            {/* Custom Foods List */}
            {filteredCustomFoods.length > 0 ? (
              <div className="divide-y divide-dark-border/40">
                {filteredCustomFoods.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => {
                      setSelectedFood(food);
                      setQuantity(1);
                    }}
                    className="w-full py-3.5 text-left flex justify-between items-center group cursor-pointer"
                  >
                    <div className="space-y-0.5 max-w-[75%]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
                          {food.user_id === null ? 'Seed' : 'My'}
                        </span>
                        <p className="font-semibold text-xs text-slate-200 truncate group-active:text-emerald-400">
                          {food.name}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {food.brand ? `${food.brand} • ` : ''}Serving: {food.serving_size}{food.serving_unit}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-200">{Math.round(food.calories)} kcal</p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <Apple className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs">No custom foods saved yet.</p>
                <button
                  onClick={() => setShowCreateWizard(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom Food</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button for manual custom food creation */}
      {activeTab === 'custom' && (
        <div className="absolute bottom-6 right-6 shrink-0 z-10">
          <button
            onClick={() => {
              setWizardName('');
              setShowCreateWizard(true);
            }}
            className="flex items-center justify-center w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* ======================================================================
          PORTION MODAL
          ====================================================================== */}
      {selectedFood && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 border border-dark-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="max-w-[80%]">
                <h4 className="font-bold text-slate-200 text-sm truncate">{selectedFood.name}</h4>
                <p className="text-xxs text-slate-400 truncate">
                  {selectedFood.brand ? `${selectedFood.brand} • ` : ''}Base Serving: {selectedFood.serving_size}{selectedFood.serving_unit}
                </p>
              </div>
              <button
                onClick={() => setSelectedFood(null)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Quantity Slider / Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Servings / Quantity</span>
                  <span className="text-xs font-bold text-emerald-400">
                    x{quantity.toFixed(2)} ({Number((selectedFood.serving_size * quantity).toFixed(1))}{selectedFood.serving_unit})
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0.15"
                    max="5.0"
                    step="0.05"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={quantity}
                    step="0.1"
                    min="0.1"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setQuantity(val);
                    }}
                    className="w-14 bg-slate-950 border border-dark-border rounded-lg text-center py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Dynamic Nutrition Preview */}
              <div className="bg-slate-950 border border-dark-border/50 rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-center border-b border-dark-border/30 pb-2">
                  <span className="text-xs font-semibold text-slate-400">Calories</span>
                  <span className="text-sm font-black text-emerald-400">
                    {Math.round(selectedFood.calories * quantity)} kcal
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xxs font-medium">
                  <div className="bg-slate-900 border border-dark-border/30 p-2 rounded-lg space-y-0.5">
                    <span className="text-blue-400 font-bold block">Protein</span>
                    <span className="text-slate-200 text-xs font-black">
                      {Number((selectedFood.protein * quantity).toFixed(1))}g
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-dark-border/30 p-2 rounded-lg space-y-0.5">
                    <span className="text-yellow-400 font-bold block">Carbs</span>
                    <span className="text-slate-200 text-xs font-black">
                      {Number((selectedFood.carbs * quantity).toFixed(1))}g
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-dark-border/30 p-2 rounded-lg space-y-0.5">
                    <span className="text-orange-400 font-bold block">Fat</span>
                    <span className="text-slate-200 text-xs font-black">
                      {Number((selectedFood.fat * quantity).toFixed(1))}g
                    </span>
                  </div>
                </div>

                {/* Micronutrients if available */}
                {selectedFood.micronutrients && Object.keys(selectedFood.micronutrients).length > 0 && (
                  <div className="pt-1 border-t border-dark-border/30 text-[9px] text-slate-500 flex flex-wrap gap-2 justify-center">
                    {selectedFood.micronutrients.sodium !== undefined && (
                      <span>Sodium: {Math.round(selectedFood.micronutrients.sodium * quantity)}mg</span>
                    )}
                    {selectedFood.micronutrients.fiber !== undefined && (
                      <span>Fiber: {Number((selectedFood.micronutrients.fiber * quantity).toFixed(1))}g</span>
                    )}
                    {selectedFood.micronutrients.potassium !== undefined && (
                      <span>Potassium: {Math.round(selectedFood.micronutrients.potassium * quantity)}mg</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-dark-border flex gap-2">
              <button
                onClick={() => setSelectedFood(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleLogFood}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition text-center shadow-lg shadow-emerald-500/10"
              >
                Log Food
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          BARCODE SCANNER VIEWPORT MODAL
          ====================================================================== */}
      {showScanner && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between">
          {/* Scanner Header */}
          <div className="px-4 py-4 bg-slate-900 border-b border-dark-border flex items-center justify-between">
            <span className="font-bold text-slate-100 text-xs">Barcode Camera Scanner</span>
            <button
              onClick={() => setShowScanner(false)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera Scan Box */}
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
            {scannerLoading && (
              <div className="absolute inset-0 bg-slate-950 z-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-slate-400 text-xs">Initializing camera feed...</span>
              </div>
            )}

            {scanningError && (
              <div className="absolute top-4 left-4 right-4 z-20 bg-red-950/80 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scanningError}</span>
              </div>
            )}

            {/* html5-qrcode target container */}
            <div id="qr-reader" className="w-full max-w-sm h-64 overflow-hidden border border-emerald-500/40 rounded-xl" />

            <div className="mt-6 text-center px-6 space-y-1 z-10">
              <p className="text-slate-200 text-xs font-semibold">Position barcode within the frame</p>
              <p className="text-slate-500 text-[10px]">Holds code details from Open Food Facts. Scan test codes: <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">0000000000001</code> to <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">0000000000007</code> for demo simulation.</p>
            </div>
          </div>

          {/* Scanner Manual Input Fallback */}
          <div className="p-4 bg-slate-900 border-t border-dark-border space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Barcode manually (e.g. 0000000000001)"
                id="manual-barcode-input"
                className="flex-1 bg-slate-950 border border-dark-border focus:border-emerald-500/80 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget.value.trim();
                    if (input) lookupBarcode(input);
                  }
                }}
              />
              <button
                onClick={() => {
                  const el = document.getElementById('manual-barcode-input') as HTMLInputElement;
                  if (el && el.value.trim()) lookupBarcode(el.value.trim());
                }}
                className="px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          CREATE CUSTOM FOOD WIZARD MODAL
          ====================================================================== */}
      {showCreateWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-dark-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-dark-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-slate-200 text-sm">Create Custom Food</h4>
              </div>
              <button
                onClick={() => setShowCreateWizard(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado"
                  value={wizardName}
                  onChange={(e) => setWizardName(e.target.value)}
                  className="w-full bg-slate-950 border border-dark-border focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dole"
                    value={wizardBrand}
                    onChange={(e) => setWizardBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-dark-border focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Barcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    value={wizardBarcode}
                    onChange={(e) => setWizardBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-dark-border focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serving Size *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100"
                    value={wizardServingSize}
                    onChange={(e) => setWizardServingSize(e.target.value)}
                    className="w-full bg-slate-950 border border-dark-border focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serving Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. g, ml, piece"
                    value={wizardServingUnit}
                    onChange={(e) => setWizardServingUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-dark-border focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-dark-border/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Nutrition per Base Serving</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-emerald-400">Calories (kcal) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={wizardCalories}
                      onChange={(e) => setWizardCalories(e.target.value)}
                      className="w-full bg-slate-950 border border-dark-border focus:border-emerald-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-blue-400">Protein (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={wizardProtein}
                      onChange={(e) => setWizardProtein(e.target.value)}
                      className="w-full bg-slate-950 border border-dark-border focus:border-blue-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-yellow-400">Carbohydrates (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={wizardCarbs}
                      onChange={(e) => setWizardCarbs(e.target.value)}
                      className="w-full bg-slate-950 border border-dark-border focus:border-yellow-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-orange-400">Fat (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={wizardFat}
                      onChange={(e) => setWizardFat(e.target.value)}
                      className="w-full bg-slate-950 border border-dark-border focus:border-orange-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWizard(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
                >
                  Save Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
