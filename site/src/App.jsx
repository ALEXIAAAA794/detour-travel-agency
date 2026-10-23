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
import ClientJourney from "./pages/ClientJourney.jsx";
import Reviews from "./pages/Reviews.jsx";
import MentionsLegales from "./pages/MentionsLegales.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";


export default function App() {
  return (
    <AuthProvider><SupportProvider><Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="destinations" element={<Destinations />} />
        <Route path="avis" element={<Reviews />} />
        <Route path="agence" element={<Agency />} />
        <Route path="mentions-legales" element={<MentionsLegales />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="profile" element={<Profile />} />
        <Route path="assistant/classique" element={<LegacyAssistant />} />
        <Route path="assistant/confirmation" element={<PreferencesConfirmation />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="assistant.html" element={<Assistant />} />
        <Route path="contact" element={<Contact />} />
        <Route path="pre-reservation" element={<ClientJourney />} />
        <Route path="espace/:section?" element={<ClientJourney />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes></SupportProvider></AuthProvider>
  );
}
