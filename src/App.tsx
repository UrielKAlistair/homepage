import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Poetry from "./pages/Poetry"
import NotFound from "./pages/NotFound";

// Notes pull in the markdown and maths renderers, so they load only when a note is opened
const NotePage = lazy(() => import("./pages/Notes/NotePage"));

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* One home page for both: /trail is the trail map grown to full size, not a separate page */}
      <Route element={<Home />}>
        <Route path="/" element={null} />
        <Route path="/trail" element={null} />
      </Route>
      <Route path="/poetry" element={<Poetry />} />
      <Route path="/notes/:slug" element={<Suspense fallback={<div className="min-h-screen bg-background" />}><NotePage /></Suspense>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
