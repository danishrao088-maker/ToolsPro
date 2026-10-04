import { CategoriesSection } from "../components/home/CategoriesSection";
import { Hero } from "../components/home/Hero";
import { PopularTools } from "../components/home/PopularTools";
import { TrustStrip } from "../components/home/TrustStrip";
import { usePageMeta } from "../hooks/usePageMeta";

export default function HomePage() {
  usePageMeta("ToolsPro", "Simple, powerful tools to make your everyday work easier. No registration, no hidden charges.");
  return (
    <>
      <Hero />
      <TrustStrip />
      <PopularTools />
      <CategoriesSection />
    </>
  );
}