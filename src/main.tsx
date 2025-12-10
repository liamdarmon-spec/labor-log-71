import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Global error handler for unhandled promise rejections
// This catches async errors that ErrorBoundary cannot catch
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser error logging (we're handling it)
  event.preventDefault();
  
  // In production, you might want to show a toast notification here
  // For now, we log it to help with debugging
  if (import.meta.env.DEV) {
    console.error('Promise rejection details:', {
      message: event.reason?.message || 'Unknown error',
      stack: event.reason?.stack,
    });
  }
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  
  // Log additional context in development
  if (import.meta.env.DEV) {
    console.error('Error details:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
