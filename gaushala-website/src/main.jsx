import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { DataProvider } from "./context/DataContext.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import { ReportsProvider } from "./context/ReportsContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <DataProvider>
          <ReportsProvider>
            <App />
          </ReportsProvider>
        </DataProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
