import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Room from "@/pages/Room";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import JoinByCode from "@/pages/JoinByCode";

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/join/:code" element={<JoinByCode />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster
              theme="dark"
              position="top-center"
              toastOptions={{
                style: {
                  background: "rgba(10,10,10,0.92)",
                  border: "1px solid rgba(225,29,72,0.35)",
                  color: "#fafafa",
                  backdropFilter: "blur(16px)",
                },
              }}
            />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </div>
  );
}
