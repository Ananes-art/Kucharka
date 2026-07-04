import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Recipes from "./pages/Recipes";
import RecipeDetail from "./pages/RecipeDetail";
import RecipeForm from "./pages/RecipeForm";
import Stock from "./pages/Stock";
import Ingredients from "./pages/Ingredients";
import ReceiptUpload from "./pages/ReceiptUpload";
import ReceiptWizard from "./pages/ReceiptWizard";
import Shopping from "./pages/Shopping";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="recepty" element={<Recipes />} />
        <Route path="recepty/novy" element={<RecipeForm />} />
        <Route path="recepty/:id" element={<RecipeDetail />} />
        <Route path="recepty/:id/upravit" element={<RecipeForm />} />
        <Route path="sklad" element={<Stock />} />
        <Route path="suroviny" element={<Ingredients />} />
        <Route path="uctenka" element={<ReceiptUpload />} />
        <Route path="uctenka/:id" element={<ReceiptWizard />} />
        <Route path="nakup" element={<Shopping />} />
      </Route>
    </Routes>
  );
}
