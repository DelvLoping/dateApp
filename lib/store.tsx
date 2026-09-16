'use client';

import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type HistoryEntry = { type: string; value: string; at: string };
export type DateState = {
  scene: number;
  noCount: number;
  date: string | null;
  time: string | null;
  venue: string | null;
  address: string;
  review: string;
  history: HistoryEntry[];
};

const initialState: DateState = {
  scene: 0,
  noCount: 0,
  date: null,
  time: null,
  venue: null,
  address: '',
  review: '',
  history: [],
};

function remember(state: DateState, type: string, value: string, at: string) {
  state.history.push({ type, value, at });
}

const dateSlice = createSlice({
  name: 'date',
  initialState,
  reducers: {
    hydrate: (_state, action: PayloadAction<Partial<DateState>>) => ({ ...initialState, ...action.payload }),
    sayNo: (state, action: PayloadAction<string>) => {
      state.noCount += 1;
      remember(state, 'invitation:no', String(state.noCount), action.payload);
    },
    nextScene: (state, action: PayloadAction<string>) => {
      state.scene += 1;
      remember(state, 'scene:complete', String(state.scene), action.payload);
    },
    setDate: (state, action: PayloadAction<{ value: string; at: string }>) => {
      state.date = action.payload.value;
      remember(state, 'date', action.payload.value, action.payload.at);
    },
    setTime: (state, action: PayloadAction<{ value: string; at: string }>) => {
      state.time = action.payload.value;
      remember(state, 'time', action.payload.value, action.payload.at);
    },
    setVenue: (state, action: PayloadAction<{ value: string; at: string }>) => {
      state.venue = action.payload.value;
      remember(state, 'venue', action.payload.value, action.payload.at);
    },
    setAddress: (state, action: PayloadAction<{ value: string; at: string }>) => {
      state.address = action.payload.value;
      remember(state, 'address', action.payload.value, action.payload.at);
    },
    setReview: (state, action: PayloadAction<{ value: string; at: string }>) => {
      state.review = action.payload.value;
      remember(state, 'review', action.payload.value, action.payload.at);
    },
    reset: () => initialState,
  },
});

export const actions = dateSlice.actions;
export type RootState = { date: DateState };
function makeStore() { return configureStore({ reducer: { date: dateSlice.reducer } }); }

export function StoreProvider({ children, storageKey }: { children: ReactNode; storageKey: string }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  const [ready, setReady] = useState(false);
  if (!storeRef.current) storeRef.current = makeStore();

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try { storeRef.current?.dispatch(actions.hydrate(JSON.parse(raw))); } catch { /* ignore stale data */ }
    }
    setReady(true);
    return storeRef.current?.subscribe(() => {
      localStorage.setItem(storageKey, JSON.stringify(storeRef.current?.getState().date));
    });
  }, [storageKey]);

  return <Provider store={storeRef.current}><div className={ready ? 'state-ready' : 'state-loading'}>{children}</div></Provider>;
}
