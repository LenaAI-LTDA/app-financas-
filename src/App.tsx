import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { SystemSettingsProvider, useSystemSettings } from "./contexts/SystemSettingsContext";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import UpdatePassword from "./pages/auth/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import FutureTransactions from "./pages/FutureTransactions";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

// Create the query client as a constant outside the component
const queryClient = new QueryClient();

// Componente de SplashScreen para mostrar enquanto carrega as configurações
const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="text-lg font-medium">Carregando configurações...</p>
      </div>
    </div>
  );
};

// Componente para controlar quando mostrar o conteúdo principal
const AppContent = () => {
  const { loading } = useSystemSettings();
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Atraso mínimo para evitar flash de conteúdo
  useEffect(() => {
    if (!loading) {
      // Garante pelo menos 500ms de carregamento para evitar flash visual
      const timer = setTimeout(() => {
        setInitialLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  // Mostra o splash screen durante o carregamento inicial
  if (initialLoading) {
    return <SplashScreen />;
  }
  
  return (
    <>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        
        {/* Rotas de autenticação */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/update-password" element={<UpdatePassword />} />
        
        {/* Rotas da aplicação */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/future-transactions" element={<FutureTransactions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SystemSettingsProvider>
              <AppContent />
            </SystemSettingsProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

export default App;
