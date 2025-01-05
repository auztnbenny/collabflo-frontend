//client\src\pages\DashboardPage.tsx
import React from "react";
import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
} from "@clerk/clerk-react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import IntroPage from "./pages/intropage";
import SignInPage from "./pages/SignIn";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import Toast from "./components/toast/Toast";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables.");
}

const App: React.FC = () => {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<IntroPage />} />

          {/* Authentication Routes */}
          <Route path="/sign-in" element={<SignInPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <SignedIn>
                <DashboardPage />
              </SignedIn>
            }
          />
          <Route
            path="/home"
            element={
              <SignedIn>
                <HomePage />
              </SignedIn>
            }
          />
          <Route
            path="/editor/:roomId"
            element={
              <SignedIn>
                <EditorPage />
              </SignedIn>
            }
          />

          {/* Redirect all other routes to Sign-In */}
          <Route path="*" element={<RedirectToSignIn />} />
        </Routes>
      </Router>
      <Toast />
    </ClerkProvider>
  );
};

export default App;
