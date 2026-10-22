import Dashboard from "./pages/Dashboard";

export default function App() {
  const user = {
    firstName: "Gestionnaire",
    name: "Gestionnaire",
  };

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        window.alert("La connexion sera réactivée ultérieurement.");
      }}
    />
  );
}
