import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Destinations from "./pages/Destinations.jsx";
import Agency from "./pages/Agency.jsx";
import { SupportProvider } from "./support/SupportContext.jsx";
import Assistant from "./pages/Assistant.jsx";
import LegacyAssistant from "./pages/LegacyAssistant.jsx";
import PreferencesConfirmation from "./pages/PreferencesConfirmation.jsx";
import Contact from "./pages/Contact.jsx";


export default function App() {
  return (
    <SupportProvider><Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="destinations" element={<Destinations />} />
        <Route path="agence" element={<Agency />} />
        <Route path="assistant/classique" element={<LegacyAssistant />} />
        <Route path="assistant/confirmation" element={<PreferencesConfirmation />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="assistant.html" element={<Assistant />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes></SupportProvider>
  );
}
