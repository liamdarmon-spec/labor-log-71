/**
 * ErrorTrigger - Development-only component to test error boundaries
 * 
 * Only rendered in development mode.
 * Allows testing different types of errors to verify error handling works.
 */

import { useState } from 'react';
import { AlertTriangle, Bug, Zap } from 'lucide-react';

// Component that throws an error when triggered
function ErrorThrowingComponent(): never {
  throw new Error('Test error thrown by ErrorTrigger component');
}

export function ErrorTrigger() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const triggerRenderError = () => {
    setShouldThrow(true);
  };

  const triggerAsyncError = () => {
    // This will be caught by the global unhandledrejection handler
    Promise.reject(new Error('Test async error from ErrorTrigger'));
  };

  const triggerUncaughtError = () => {
    // This will be caught by the global error handler
    setTimeout(() => {
      throw new Error('Test uncaught error from ErrorTrigger');
    }, 0);
  };

  // If shouldThrow is true, render the error-throwing component
  if (shouldThrow) {
    return <ErrorThrowingComponent />;
  }

  return (
    <>
      {/* Toggle button - fixed position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-colors"
        title="Error Testing Tools (Dev Only)"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Error Testing (Dev Only)</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Use these buttons to test error handling. The app should recover gracefully.
          </p>

          <div className="space-y-2">
            <button
              onClick={triggerRenderError}
              className="w-full flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 text-sm"
            >
              <Zap className="h-4 w-4" />
              Trigger Render Error
            </button>
            
            <button
              onClick={triggerAsyncError}
              className="w-full flex items-center gap-2 px-3 py-2 bg-orange-500/10 text-orange-600 rounded hover:bg-orange-500/20 text-sm"
            >
              <Zap className="h-4 w-4" />
              Trigger Async Error
            </button>
            
            <button
              onClick={triggerUncaughtError}
              className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-600 rounded hover:bg-yellow-500/20 text-sm"
            >
              <Zap className="h-4 w-4" />
              Trigger Uncaught Error
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Check console for logged errors. Render errors will show the error boundary UI.
          </p>
        </div>
      )}
    </>
  );
}

export default ErrorTrigger;
