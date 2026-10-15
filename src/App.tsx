import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Poetry from "./pages/Poetry"
import Trail from "./pages/Trail/Trail"
import NotFound from "./pages/NotFound";

// Notes pull in the markdown and maths renderers, so they load only when a note is opened
const NotePage = lazy(() => import("./pages/Notes/NotePage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trail" element={<Trail />} />
          <Route path="/poetry" element={<Poetry />} />
          <Route path="/notes/:slug" element={<Suspense fallback={<div className="min-h-screen bg-background" />}><NotePage /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
