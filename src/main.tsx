import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/newsreader/wght.css'
import './index.css'
import App from './App.tsx'
import { RuntimeErrorBoundary } from './components/RuntimeErrorBoundary.tsx'
import { diagnostics, installBrowserDiagnosticHandlers } from './state/diagnostics.ts'
import { startSessionCheckpoints } from './state/sessionCheckpoint.ts'

installBrowserDiagnosticHandlers()
const sessionCheckpoints = startSessionCheckpoints()
if (import.meta.hot) import.meta.hot.dispose(() => sessionCheckpoints.dispose())

createRoot(document.getElementById('root')!, {
  onCaughtError: (error) => diagnostics.record({ code: 'react_caught', severity: 'error', subsystem: 'react', operation: 'render', outcome: 'failed', source: 'react-root', error }),
  onUncaughtError: (error) => diagnostics.record({ code: 'react_uncaught', severity: 'error', subsystem: 'react', operation: 'render', outcome: 'failed', source: 'react-root', error }),
  onRecoverableError: (error) => diagnostics.record({ code: 'react_recoverable', severity: 'warning', subsystem: 'react', operation: 'recover', outcome: 'recovered', source: 'react-root', error }),
}).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <App sessionCheckpoints={sessionCheckpoints} />
    </RuntimeErrorBoundary>
  </StrictMode>,
)
