import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Notes pull in the markdown and maths renderers, so they load only when a note is opened
const NotePage = lazy(() => import("./pages/Notes/NotePage"));

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* One home page for all three: /trail and /poetry are its panels grown to full size, not separate pages */}
      <Route element={<Home />}>
        <Route path="/" element={null} />
        <Route path="/trail" element={null} />
        <Route path="/poetry" element={null} />
      </Route>
      <Route path="/notes/:slug" element={<Suspense fallback={<div className="min-h-screen bg-background" />}><NotePage /></Suspense>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
