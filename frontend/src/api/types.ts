export type Unit = "g" | "kg" | "ml" | "l" | "ks";
export type BaseUnit = "g" | "ml" | "ks";

export interface Ingredient {
  id: number;
  name: string;
  category: string | null;
  baseUnit: BaseUnit;
  aliases?: IngredientAlias[];
  inStock?: boolean;
}

export interface IngredientAlias {
  id: number;
  keyword: string;
  label: string;
  ingredientId: number;
}

export interface RecipeIngredient {
  id: number;
  ingredientId: number;
  quantity: number;
  unit: Unit;
  note: string | null;
  ingredient?: Ingredient;
}

export interface RecipeStep {
  id: number;
  order: number;
  text: string;
  image: string | null;
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
}

export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  prepMinutes: number | null;
  servings: number;
  rating: number | null;
  favorite: boolean;
  mainImage: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  comments?: Comment[];
  _count?: { ingredients: number; comments: number };
}

export interface StockItem {
  id: number;
  ingredientId: number;
  quantity: number;
  unit: Unit;
  expiryDate: string | null;
  purchaseDate: string;
  ingredient: Ingredient;
}

export interface Suggestion {
  ingredientId: number | null;
  name: string | null;
  score: number;
  source: "alias" | "fuzzy" | null;
}

export interface ReceiptLine {
  id: number;
  rawText: string;
  keyword: string;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  ingredientId: number | null;
  expiryDate: string | null;
  processed: boolean;
  ignored: boolean;
  suggestion: Suggestion | null;
}

export interface Receipt {
  id: number;
  image: string;
  store: string | null;
  purchasedAt: string | null;
  total: number | null;
  rawText: string | null;
  status: string;
  createdAt: string;
  lines: ReceiptLine[];
  _count?: { lines: number };
}

export interface ShoppingItem {
  id: number;
  ingredientId: number | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  checked: boolean;
  ingredient?: Ingredient | null;
}

export interface Recommendation {
  id: number;
  title: string;
  mainImage: string | null;
  category: string | null;
  prepMinutes: number | null;
  rating: number | null;
  totalIngredients: number;
  availableCount: number;
  missingCount: number;
  expiringUsed: { name: string; daysLeft: number }[];
  score: number;
}
