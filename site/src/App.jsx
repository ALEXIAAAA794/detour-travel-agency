import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Destinations from "./pages/Destinations.jsx";
import Agency from "./pages/Agency.jsx";
import Contact from "./pages/Contact.jsx";
import ClientJourney from "./pages/ClientJourney.jsx";


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="destinations" element={<Destinations />} />
        <Route path="agence" element={<Agency />} />
        <Route path="contact" element={<Contact />} />
        <Route path="pre-reservation" element={<ClientJourney />} />
        <Route path="espace/:section?" element={<ClientJourney />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
