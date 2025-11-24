import { Outlet } from "react-router-dom";
import SnowfallOverlay from "../components/common/SnowfallOverlay";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";

export default function MainLayout() {
  return (
    <div className="relative flex flex-col min-h-screen bg-slate-50">
      <SnowfallOverlay count={36} />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
