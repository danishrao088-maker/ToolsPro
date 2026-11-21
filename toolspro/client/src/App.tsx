import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { LoadingIndicator } from "./components/common/LoadingIndicator";
import { Layout } from "./components/layout/Layout";
import AboutPage from "./pages/AboutPage";
import AllToolsPage from "./pages/AllToolsPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ToolDetailPage from "./pages/ToolDetailPage";

// Admin panel alag chunk hai: aam visitors ko ye code download nahi hota
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  return (
    <Routes>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="tools" element={<AllToolsPage />} />
        <Route path="tools/:slug" element={<ToolDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="category/:slug" element={<CategoryDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}