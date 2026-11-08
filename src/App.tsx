import { useMemo, useState } from 'react'
import { ratioValue } from '@engine'
import { layoutCover, variantForSeed } from '@engine/renderers/v1/layout'
import { Alert } from './components/Alert'
import { ControlsPanel } from './components/ControlsPanel'
import { CoverPreview } from './components/CoverPreview'
import { ExportPanel } from './components/ExportPanel'
import { Header } from './components/Header'
import { HelpSection } from './components/HelpSection'
import { TextFields } from './components/TextFields'
import { useCoverState } from './hooks/useCoverState'
import { useFonts } from './hooks/useFonts'
import { initialStateFromUrl, useUrlSync } from './hooks/useUrlState'
import { randomSeed } from './lib/randomSeed'

export default function App() {
  const [initial] = useState(initialStateFromUrl)
  const { state, setParams, setTexts, replace } = useCoverState(initial.state)
  useUrlSync(state, replace)
  const fontStatus = useFonts()
  const [issues, setIssues] = useState(initial.issues)

  const ratio = ratioValue(state.params.ratio)
  const layout = useMemo(
    () => layoutCover(state.texts, variantForSeed(state.params.seed), ratio),
    [state.texts, state.params.seed, ratio],
  )

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6">
      <Header />

      {issues.length > 0 && (
        <div className="mb-4">
          <Alert variant="warning" onDismiss={() => setIssues([])}>
            Some values in the link were repaired: {issues.join('; ')}.
          </Alert>
        </div>
      )}
      {fontStatus === 'failed' && (
        <div className="mb-4">
          <Alert variant="error">The cover font could not be loaded. The preview falls back to a system font.</Alert>
        </div>
      )}

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <section className="panel !p-2" aria-label="Cover preview">
          <CoverPreview state={state} layout={layout} fontsReady={fontStatus !== 'loading'} />
        </section>
        <div className="space-y-4">
          <section className="panel" aria-label="Look">
            <ControlsPanel params={state.params} onChange={setParams} onShuffle={() => setParams({ seed: randomSeed() })} />
          </section>
          <section className="panel" aria-label="Text">
            <TextFields texts={state.texts} onChange={setTexts} />
          </section>
          <section className="panel" aria-label="Export">
            <ExportPanel state={state} layout={layout} fontsReady={fontStatus !== 'loading'} />
          </section>
        </div>
      </main>

      <HelpSection />
    </div>
  )
}
