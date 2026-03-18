import './App.css'
import { Suspense, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Sentry } from '@/lib/sentry';
import { logCrash, setUser } from '@/lib/crashLogger';
import PageErrorBoundary from '@/components/PageErrorBoundary';

const SentryErrorBoundary = Sentry.ErrorBoundary ?? (({ children }) => children);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, user } = useAuth();

  // Set user context for crash logging once auth resolves
  useEffect(() => {
    if (user) {
      setUser({ id: user.id, email: user.email, full_name: user.full_name });
    }
  }, [user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <PageErrorBoundary>
              <MainPage />
            </PageErrorBoundary>
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <PageErrorBoundary>
                  <Page />
                </PageErrorBoundary>
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {
  // Catch unhandled promise rejections globally
  useEffect(() => {
    const handler = (event) => {
      logCrash(event.reason || "Unhandled promise rejection", {
        page: window.location.pathname.replace("/", "") || "Home1",
        action: "unhandledRejection",
        severity: "error",
      });
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <SentryErrorBoundary fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#4C6EF5] via-[#7B5EF5] to-[#9B6EF5] text-white" dir="rtl">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">😵</div>
          <h1 className="text-2xl font-bold mb-2">משהו השתבש</h1>
          <p className="text-white/70 mb-4">אנחנו עובדים על זה!</p>
          <button onClick={() => window.location.reload()} className="bg-white/20 px-6 py-2 rounded-lg hover:bg-white/30">
            נסה שוב
          </button>
        </div>
      </div>
    }>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </SentryErrorBoundary>
  )
}

export default App
