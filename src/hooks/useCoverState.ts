import { useCallback, useReducer } from 'react'
import type { CoverParams, CoverState, CoverTexts } from '@engine'

type Action =
  | { type: 'params'; patch: Partial<CoverParams> }
  | { type: 'texts'; patch: Partial<CoverTexts> }
  | { type: 'replace'; state: CoverState }

function reducer(state: CoverState, action: Action): CoverState {
  switch (action.type) {
    case 'params':
      return { ...state, params: { ...state.params, ...action.patch } }
    case 'texts':
      return { ...state, texts: { ...state.texts, ...action.patch } }
    case 'replace':
      return action.state
  }
}

export interface CoverStateApi {
  state: CoverState
  setParams: (patch: Partial<CoverParams>) => void
  setTexts: (patch: Partial<CoverTexts>) => void
  replace: (state: CoverState) => void
}

/** The single source of truth for the cover; the URL mirrors it (see useUrlSync). */
export function useCoverState(initial: CoverState): CoverStateApi {
  const [state, dispatch] = useReducer(reducer, initial)
  const setParams = useCallback((patch: Partial<CoverParams>) => dispatch({ type: 'params', patch }), [])
  const setTexts = useCallback((patch: Partial<CoverTexts>) => dispatch({ type: 'texts', patch }), [])
  const replace = useCallback((s: CoverState) => dispatch({ type: 'replace', state: s }), [])
  return { state, setParams, setTexts, replace }
}
