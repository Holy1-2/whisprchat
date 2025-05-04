import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import { WhisprLogo } from './WhisprLogo';

// Lazy load pages with prefetching
const AuthForm = lazy(() => import('./AuthForm'));
const ChatScreen = lazy(() => import('./components/ChatScreen'));
const NewChat = lazy(() => import('./components/UserSearch'));
const ProfileSettings = lazy(() => import('./ProfileSettings'));
const VoiceNotesList = lazy(() => import('./components/VoiceNotesList'));
const NotFound = lazy(() => import('./components/NotFound'));

// Optimized loader component
function Loader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#1a120b] space-y-4">
    {/* Animated sound wave loader */}
    <div className="relative flex items-center justify-center h-20 w-20">
      
      
      {/* Spinner */}
      <div className="absolute h-12 w-12 border-4 border-t-transparent border-[#e5d5c6] rounded-full animate-spin" />
    </div>

    {/* Loading text with fade animation */}
    <p className="text-[#e5d5c6] font-manrope animate-pulse">
      Connecting Voices...
    </p>

  </div>
  );
}



function Layout() {
  return (
    <div className="flex flex-col h-screen bg-[#1a120b]">
      <header className="p-4 flex items-center justify-between border-b-2 border-[#3d2e20] z-30">
        <div className="flex-1 flex justify-center">
          <Link to="/" className="hover:opacity-80 transition-opacity">
          <WhisprLogo className="w-24 h-24 mb-4" />
          </Link>
        </div>
        <Link to="/settings" className="text-[#e5d5c6] hover:text-[#c4b5a3] transition-colors">
          <Cog6ToothIcon className="h-6 w-6" />
        </Link>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/auth" replace />;
}

// Preload important components after initial render
function usePreload() {
  useEffect(() => {
    Promise.all([
      import('./components/ChatScreen'),
      import('./ProfileSettings')
    ]);
  }, []);
}

export default function App() {
  usePreload();

  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/auth" element={<AuthForm />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/voice-notes" />} />
              <Route path="chat/:userId" element={<ChatScreen />} />
              <Route path="new-chat" element={<NewChat />} />
              <Route path="settings" element={<ProfileSettings />} />
              <Route path="voice-notes" element={<VoiceNotesList />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}