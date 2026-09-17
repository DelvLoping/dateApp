'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Check, ChevronsUpDown, Heart, MapPin, RotateCcw, Send, Sparkles, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { actions, type RootState, StoreProvider } from '@/lib/store';
import { getScenario, type Scenario } from '@/lib/scenarios';

const now = () => new Date().toISOString();
const timeSlots = Array.from({ length: 96 }, (_, index) => {
  const minutes = index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function normalizeTime(rawValue: string) {
  const value = rawValue.trim();
  let hours: number;
  let minutes: number;

  if (/^\d{1,2}$/.test(value)) {
    hours = Number(value);
    minutes = 0;
  } else if (/^\d{3,4}$/.test(value)) {
    hours = Number(value.slice(0, -2));
    minutes = Number(value.slice(-2));
  } else {
    const match = value.match(/^(\d{1,2}):([0-5]\d)$/);
    if (!match) return null;
    hours = Number(match[1]);
    minutes = Number(match[2]);
  }

  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function shiftTime(rawValue: string, amount: number) {
  const normalized = normalizeTime(rawValue) ?? '19:00';
  const [hours, minutes] = normalized.split(':').map(Number);
  const shifted = (hours * 60 + minutes + amount + 24 * 60) % (24 * 60);
  return `${String(Math.floor(shifted / 60)).padStart(2, '0')}:${String(shifted % 60).padStart(2, '0')}`;
}

function isDinnerTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 10 * 60 && totalMinutes <= 23 * 60;
}

type VenueOption = {
  id: string;
  name: string;
  label: string;
  rating: number;
  image: string;
  alt: string;
  source: string;
  blocked?: boolean;
  blockedTitle?: string;
  blockedMessage?: string;
};

const venues: VenueOption[] = [
  { id: 'apostrophe', name: "L’Apostrophe", label: 'Brasserie gastronomique', rating: 4.5, image: '/restaurants/apostrophe.jpg', alt: "Salle du restaurant L’Apostrophe à Reims", source: 'Tourisme en Champagne' },
  { id: 'alba', name: 'Alba', label: 'Cuisine italienne', rating: 4.3, image: '/restaurants/alba.jpg', alt: 'Salle du restaurant Alba à Reims', source: 'BooknBook' },
  { id: 'otacos', name: "O’Tacos", label: 'Option audacieuse', rating: 1, image: '/restaurants/otacos.jpg', alt: "Restaurant O’Tacos à Reims", source: 'Restaurant Guru', blocked: true },
  { id: 'au-bureau', name: 'Au Bureau', label: 'Pub & brasserie', rating: 3.5, image: '/restaurants/au-bureau.jpg', alt: 'Restaurant Au Bureau à Reims', source: 'Tourisme en Champagne' },
  {
    id: 'commissariat',
    name: 'Commissariat de police de Reims',
    label: 'Expérience cinq étoiles',
    rating: 5,
    image: '/restaurants/commissariat-reims.jpg',
    alt: 'Hôtel de police de Reims, boulevard Louis-Roederer',
    source: 'Wikimedia Commons',
    blocked: true,
    blockedTitle: 'Très mauvaise idée.',
    blockedMessage: 'Mais tu vas sûrement y finir pour excès de beauté.',
  },
];

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="experience-shell"><div className="grain" /><div className="scene-glow scene-glow-left" /><div className="scene-glow scene-glow-right" />{children}</main>;
}

function SceneHeader({ eyebrow, title, note }: { eyebrow?: string; title: React.ReactNode; note?: string }) {
  return <header className="scene-header">{eyebrow && <p className="eyebrow reveal-one">{eyebrow}</p>}<h1 className="scene-title">{title}</h1>{note && <p className="scene-note reveal-three">{note}</p>}</header>;
}

function Invitation({ guest }: { guest: string }) {
  const dispatch = useDispatch();
  const noCount = useSelector((state: RootState) => state.date.noCount);
  const [runaway, setRunaway] = useState<{ left: number; top: number } | null>(null);
  const [hidePhase, setHidePhase] = useState<'hidden' | 'peeking' | null>(null);
  const hideTimer = useRef<number | null>(null);
  const peekTimer = useRef<number | null>(null);
  const escapeMoves = useRef(0);
  const yesScale = 1 + Math.min(noCount, 6) * 0.1;
  const mobileYesScale = 1 + Math.min(noCount, 6) * 0.03;

  const clearHideTimers = () => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current);
    hideTimer.current = null;
    peekTimer.current = null;
  };

  useEffect(() => () => clearHideTimers(), []);

  const moveNo = (pointerX: number, pointerY: number, button?: HTMLElement) => {
    clearHideTimers();
    setHidePhase(null);
    escapeMoves.current += 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const rect = button?.getBoundingClientRect();
    const originX = runaway?.left ?? (rect ? rect.left + rect.width / 2 : pointerX);
    const originY = runaway?.top ?? (rect ? rect.top + rect.height / 2 : pointerY);
    const halfWidth = Math.max(55, (rect?.width ?? 110) / 2);
    const halfHeight = Math.max(26, (rect?.height ?? 52) / 2);
    const minX = halfWidth + 18;
    const maxX = width - halfWidth - 18;
    const minY = halfHeight + 18;
    const maxY = height - halfHeight - 18;
    const roll = Math.random();
    const maxLongJump = Math.min(360, width * .42, height * .42);
    const distance = roll < .68
      ? 85 + Math.random() * 95
      : roll < .94
        ? 180 + Math.random() * 90
        : 270 + Math.random() * Math.max(20, maxLongJump - 270);
    const awayAngle = Math.atan2(originY - pointerY, originX - pointerX);
    const angle = Math.random() < .46
      ? awayAngle + (Math.random() - .5) * 1.7
      : Math.random() * Math.PI * 2;
    let left = Math.max(minX, Math.min(maxX, originX + Math.cos(angle) * distance));
    let top = Math.max(minY, Math.min(maxY, originY + Math.sin(angle) * distance));
    const yesButton = document.querySelector<HTMLElement>('.yes-button');
    const yesRect = yesButton?.getBoundingClientRect();

    if (yesRect && escapeMoves.current >= 3 && Math.random() < .16) {
      left = yesRect.left + yesRect.width / 2 + (Math.random() - .5) * Math.min(28, yesRect.width * .12);
      top = yesRect.top + yesRect.height / 2 + (Math.random() - .5) * 12;
      setRunaway({ left, top });
      setHidePhase('hidden');

      hideTimer.current = window.setTimeout(() => {
        const currentYesRect = document.querySelector<HTMLElement>('.yes-button')?.getBoundingClientRect();
        if (!currentYesRect) {
          setHidePhase(null);
          return;
        }
        const peekX = (rect?.width ?? 110) * .08;
        const peekY = (rect?.height ?? 52) * .08;
        const directions = [
          { left: currentYesRect.left - peekX, top: currentYesRect.top + currentYesRect.height / 2 },
          { left: currentYesRect.right + peekX, top: currentYesRect.top + currentYesRect.height / 2 },
          { left: currentYesRect.left + currentYesRect.width / 2, top: currentYesRect.top - peekY },
          { left: currentYesRect.left + currentYesRect.width / 2, top: currentYesRect.bottom + peekY },
        ];
        const peek = directions[Math.floor(Math.random() * directions.length)];
        setRunaway({
          left: Math.max(minX, Math.min(maxX, peek.left)),
          top: Math.max(minY, Math.min(maxY, peek.top)),
        });
        setHidePhase('peeking');
        peekTimer.current = window.setTimeout(() => setHidePhase(null), 900);
      }, 2000);
      return;
    }

    if (Math.hypot(left - pointerX, top - pointerY) < 82) {
      left = Math.max(minX, Math.min(maxX, originX - Math.cos(angle) * Math.max(115, distance)));
      top = Math.max(minY, Math.min(maxY, originY - Math.sin(angle) * Math.max(115, distance)));
    }
    setRunaway({ left, top });
  };
  const refuse = (pointerX: number, pointerY: number, button: HTMLElement) => {
    if (noCount >= 6) {
      moveNo(pointerX, pointerY, button);
      return;
    }
    dispatch(actions.sayNo(now()));
    if (noCount === 5) moveNo(pointerX, pointerY, button);
  };

  return <section className="invitation-panel scene-card">
    <SceneHeader eyebrow={`Une question pour ${guest}`} title={<>Je t’emmène dîner.<br /><em>Tu me suis&nbsp;?</em></>} />
    <div className="choice-zone">
      <Button className="yes-button" style={{ '--yes-scale': yesScale, '--yes-scale-mobile': mobileYesScale } as React.CSSProperties} onClick={() => dispatch(actions.nextScene(now()))}>Oui, avec plaisir <ArrowRight /></Button>
      <Button
        variant="ghost"
        className={`no-button ${runaway ? 'is-runaway' : ''} ${hidePhase ? `is-${hidePhase}` : ''}`}
        style={runaway ? { left: runaway.left, top: runaway.top } : undefined}
        onPointerEnter={(event) => noCount >= 6 && hidePhase === null && moveNo(event.clientX, event.clientY, event.currentTarget)}
        onClick={(event) => refuse(event.clientX, event.clientY, event.currentTarget)}
      >Non</Button>
    </div>
    {noCount > 0 && noCount < 6 && <p className="tease"><Sparkles size={14} /> Le “oui” devient franchement convaincant.</p>}
  </section>;
}

function Schedule() {
  const dispatch = useDispatch();
  const { date, time } = useSelector((state: RootState) => state.date);
  const [displayTime, setDisplayTime] = useState(time ?? '');
  const [inputTime, setInputTime] = useState(time ?? '');
  const [spinning, setSpinning] = useState(false);
  const [timeWarning, setTimeWarning] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeError, setTimeError] = useState('');
  const correctionRunning = useRef(false);
  const timeWarningTimer = useRef<number | null>(null);
  const [rejectedDate, setRejectedDate] = useState<Date | undefined>();
  const [dateWarning, setDateWarning] = useState(false);
  const selected = date ? new Date(`${date}T12:00:00`) : undefined;
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const lastDay = addDays(startOfDay(new Date()), 17);

  useEffect(() => () => {
    if (timeWarningTimer.current) window.clearTimeout(timeWarningTimer.current);
  }, []);

  const correctTime = async () => {
    if (correctionRunning.current) return;
    correctionRunning.current = true;
    if (timeWarningTimer.current) window.clearTimeout(timeWarningTimer.current);
    setTimeWarning(true);
    setTimeOpen(false);
    setSpinning(true);
    const reel = ['00:30', '17:45', '23:15', '18:20', '01:40', '20:10', '21:00'];
    const delays = [90, 100, 115, 140, 180, 250, 420];
    for (let index = 0; index < reel.length; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, delays[index]));
      setDisplayTime(reel[index]);
    }
    dispatch(actions.setTime({ value: '21:00', at: now() }));
    setInputTime('21:00');
    setSpinning(false);
    correctionRunning.current = false;
    timeWarningTimer.current = window.setTimeout(() => setTimeWarning(false), 3600);
  };

  const chooseTime = (value: string) => {
    if (correctionRunning.current || !value) return;
    setInputTime(value);
    setDisplayTime(value);
    dispatch(actions.setTime({ value, at: now() }));
    if (date && !isDinnerTime(value)) void correctTime();
  };

  const commitTime = (rawValue: string) => {
    const value = normalizeTime(rawValue);
    if (!value) {
      setTimeError('Entre une heure valide, par exemple 21:00.');
      return;
    }
    setTimeError('');
    setTimeOpen(false);
    void chooseTime(value);
  };

  const previewShiftedTime = (amount: number) => {
    const value = shiftTime(inputTime, amount);
    setInputTime(value);
    setDisplayTime(value);
    setTimeError('');
    setTimeOpen(true);
  };

  const continueSchedule = () => {
    const value = normalizeTime(inputTime);
    if (!value) {
      setTimeError('Entre une heure valide, par exemple 21:00.');
      return;
    }
    if (!isDinnerTime(value)) {
      setInputTime(value);
      setDisplayTime(value);
      dispatch(actions.setTime({ value, at: now() }));
      void correctTime();
      return;
    }
    dispatch(actions.nextScene(now()));
  };

  return <section className="wide-panel scene-card">
    <SceneHeader eyebrow="Le rendez-vous" title={<em>Quand&nbsp;?</em>} note="Envoie la date et l’heure." />
    <div className="schedule-grid">
      <div className={`calendar-wrap ${dateWarning ? 'date-rejected' : ''}`}>
        <Calendar
          mode="single"
          locale={fr}
          showOutsideDays={false}
          selected={selected}
          defaultMonth={tomorrow}
          disabled={{ before: tomorrow }}
          modifiers={{ rejected: rejectedDate ? [rejectedDate] : [] }}
          modifiersClassNames={{ rejected: 'calendar-day-rejected' }}
          onDayClick={(day) => {
            if (day.getTime() <= lastDay.getTime()) return;
            setRejectedDate(day);
            setDateWarning(true);
            window.setTimeout(() => { setRejectedDate(undefined); setDateWarning(false); }, 4200);
          }}
          onSelect={(value) => {
            if (!value || value.getTime() > lastDay.getTime()) return;
            dispatch(actions.setDate({ value: format(value, 'yyyy-MM-dd'), at: now() }));
            const selectedTime = normalizeTime(inputTime);
            if (selectedTime && !isDinnerTime(selectedTime)) void correctTime();
          }}
        />
        <p className={`calendar-limit ${dateWarning ? 'is-visible' : ''}`} aria-live="polite">{dateWarning ? 'Beaucoup trop loin. On ne va pas attendre jusque-là.' : '\u00a0'}</p>
      </div>
      <div className={`time-picker ${spinning ? 'is-spinning' : ''}`}>
        <div className={`time-display ${displayTime ? '' : 'is-empty'}`} aria-live="polite"><span>{displayTime || 'Choisis une heure'}</span></div>
        <div
          className="time-control"
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) return;
            setTimeOpen(false);
            if (inputTime.trim()) commitTime(inputTime);
          }}
        >
          <label htmlFor="date-time">Écris ou fais défiler</label>
          <div className="time-entry">
            <input
              id="date-time"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="21:00"
              value={inputTime}
              disabled={spinning}
              aria-label="Choisir une heure"
              aria-expanded={timeOpen}
              aria-controls="time-options"
              aria-invalid={Boolean(timeError)}
              onFocus={() => setTimeOpen(true)}
              onChange={(event) => {
                const value = event.target.value.replace(/[^\d:]/g, '').slice(0, 5);
                setInputTime(value);
                const normalized = normalizeTime(value);
                if (normalized) setDisplayTime(normalized);
                else if (!value) setDisplayTime('');
                setTimeError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  previewShiftedTime(event.key === 'ArrowUp' ? -15 : 15);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  commitTime(inputTime);
                } else if (event.key === 'Escape') {
                  setTimeOpen(false);
                }
              }}
              onWheel={(event) => {
                event.preventDefault();
                previewShiftedTime(event.deltaY > 0 ? 15 : -15);
              }}
            />
            <ChevronsUpDown aria-hidden="true" />
          </div>
          {timeOpen && !spinning && <div id="time-options" className="time-options" role="listbox" aria-label="Horaires par quarts d’heure">
            {timeSlots.map((slot) => <button
              key={slot}
              type="button"
              role="option"
              aria-selected={inputTime === slot}
              className={inputTime === slot ? 'is-selected' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitTime(slot)}
            >{slot}</button>)}
          </div>}
        </div>
        {timeError && <p className="time-error" role="alert">{timeError}</p>}
        {timeWarning && <p className="time-nudge">Cette heure ne me plaît pas. Je règle ça.</p>}
      </div>
    </div>
    <Button className="next-button" disabled={!date || !normalizeTime(inputTime) || spinning} onClick={continueSchedule}>Continuer <ArrowRight /></Button>
  </section>;
}

function Venue() {
  const dispatch = useDispatch();
  const selected = useSelector((state: RootState) => state.date.venue);
  const [rejected, setRejected] = useState(false);
  return <section className="venue-panel scene-card">
    <SceneHeader eyebrow="Le lieu" title={<>Quelle ambiance<br /><em>tu choisis&nbsp;?</em></>} />
    <div className="venue-grid">
      {venues.map((venue) => <button key={venue.id} type="button" className={`venue-card ${selected === venue.id ? 'selected' : ''} ${venue.blocked && rejected ? 'rejected' : ''}`} onClick={() => {
        if (venue.blocked) { setRejected(true); window.setTimeout(() => setRejected(false), 1900); return; }
        dispatch(actions.setVenue({ value: venue.id, at: now() }));
      }}>
        <img src={venue.image} alt={venue.alt} />
        <span className="venue-shade" />
        <span className="venue-content"><span className="venue-type">{venue.label}</span><strong>{venue.name}</strong><span className="rating"><Star size={14} fill="currentColor" /> {venue.rating.toFixed(1)} · Reims</span><span className="reserve-pill">{selected === venue.id ? <><Check /> Choisi</> : 'Réserver'}</span></span>
        {venue.blocked && <span className="blocked-copy"><X /><b>{venue.blockedTitle ?? 'Non, vraiment pas.'}</b><small>{venue.blockedMessage ?? <>C’est la personne qui compte.<br />Mais faut pas abuser.</>}</small></span>}
      </button>)}
    </div>
    <Button className="next-button" disabled={!selected} onClick={() => dispatch(actions.nextScene(now()))}>Très bon choix <ArrowRight /></Button>
  </section>;
}

function launchHeartRain() {
  document.querySelector('.heart-rain')?.remove();
  const layer = document.createElement('div');
  layer.className = 'heart-rain';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const hearts = ['❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🤍', '💖', '💗', '💕', '💘', '💝'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 640px)').matches;
  const count = reducedMotion ? 24 : mobile ? 180 : 360;
  const emissionDuration = reducedMotion ? 500 : 5000;
  let longestAnimation = 0;

  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement('span');
    heart.className = 'falling-heart';
    heart.textContent = hearts[index % hearts.length];
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.fontSize = `${mobile ? 17 + Math.random() * 20 : 18 + Math.random() * 28}px`;
    const delay = reducedMotion
      ? Math.random() * emissionDuration
      : (index / count) * emissionDuration + Math.random() * 220;
    const duration = reducedMotion ? 1400 : 3600 + Math.random() * 3000;
    const drift = (Math.random() - .5) * (mobile ? 110 : 220);
    const rotation = (Math.random() - .5) * 520;
    longestAnimation = Math.max(longestAnimation, delay + duration);
    layer.appendChild(heart);
    heart.animate([
      { transform: 'translate3d(0, -14vh, 0) rotate(0deg)', opacity: 0 },
      { transform: `translate3d(${drift * .28}px, 18vh, 0) rotate(${rotation * .2}deg)`, opacity: 1, offset: .18 },
      { transform: `translate3d(${drift}px, 112vh, 0) rotate(${rotation}deg)`, opacity: .95 },
    ], { duration, delay, easing: 'cubic-bezier(.28,.12,.72,.88)', fill: 'forwards' });
  }

  window.setTimeout(() => layer.remove(), longestAnimation + 250);
}

function Address({ scenario }: { scenario: Scenario }) {
  const dispatch = useDispatch();
  const data = useSelector((state: RootState) => state.date);
  const savedAddress = data.address;
  const [value, setValue] = useState(savedAddress);
  const [error, setError] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chosen, setChosen] = useState(Boolean(savedAddress));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notificationError, setNotificationError] = useState(false);

  useEffect(() => {
    if (chosen || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/address?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        const result = await response.json() as { addresses?: string[] };
        setSuggestions(result.addresses ?? []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [chosen, value]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) { setError(true); return; }
    const address = value.trim();
    const venue = venues.find((item) => item.id === data.venue);
    dispatch(actions.setAddress({ value: address, at: now() }));
    setSending(true);
    setNotificationError(false);
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'confirmation', scenarioId: scenario.id, sender: scenario.sender, guest: scenario.guest, date: data.date, time: data.time, venue: venue?.name, address }),
      });
      if (!response.ok) throw new Error('notify');
    } catch {
      setSending(false);
      setNotificationError(true);
      return;
    }
    launchHeartRain();
    window.setTimeout(() => dispatch(actions.nextScene(now())), 2100);
  };
  return <section className="address-panel scene-card">
    <SceneHeader title={<>Envoie-moi ton adresse.<br /><em>Prépare-toi, je passe te prendre.</em></>} />
    <form className="address-form" onSubmit={submit}>
      <div className="address-combobox">
        <div className={`address-input ${error ? 'has-error' : ''}`}>
          <MapPin />
          <input
            value={value}
            name="street-address"
            autoComplete="street-address"
            onChange={(event) => { setValue(event.target.value); setChosen(false); setError(false); }}
            placeholder="Ton adresse complète"
            aria-label="Ton adresse complète"
            aria-autocomplete="list"
            aria-controls="address-suggestions"
            aria-expanded={suggestions.length > 0}
          />
          {loading && <span className="address-loading" aria-hidden="true" />}
        </div>
        {suggestions.length > 0 && <div id="address-suggestions" className="address-suggestions" role="listbox">
          {suggestions.map((address) => <button key={address} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(address); setChosen(true); setSuggestions([]); }}>{address}</button>)}
        </div>}
      </div>
      {error && <p className="form-error">Il me faut quand même savoir où te trouver.</p>}
      {notificationError && <p className="form-error">Le message n’est pas parti. Réessaie dans un instant.</p>}
      <Button className="next-button" type="submit" disabled={sending}>{sending ? <span>Envoi…</span> : <><span>C’est envoyé</span><Heart fill="currentColor" /></>}</Button>
    </form>
  </section>;
}

function Recap({ scenario }: { scenario: Scenario }) {
  const dispatch = useDispatch();
  const data = useSelector((state: RootState) => state.date);
  const [review, setReview] = useState(data.review);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const venue = venues.find((item) => item.id === data.venue);
  const prettyDate = data.date ? format(new Date(`${data.date}T12:00:00`), "EEEE d MMMM", { locale: fr }) : 'à confirmer';

  const save = async () => {
    const message = review.trim();
    if (!message) return;
    setStatus('sending');
    dispatch(actions.setReview({ value: message, at: now() }));
    try {
      const response = await fetch('/api/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'review', scenarioId: scenario.id, sender: scenario.sender, guest: scenario.guest, review: message }) });
      if (!response.ok) throw new Error('notify');
      setStatus('sent');
    } catch { setStatus('error'); }
  };

  return <section className="recap-panel scene-card">
    <div className="recap-heart"><Heart fill="currentColor" /></div>
    <p className="eyebrow">C’est un date</p>
    <h1><span>{scenario.sender}</span> date <span>{scenario.guest}</span></h1>
    <div className="ticket">
      <div><small>Lieu</small><strong>{venue?.name ?? 'Surprise'}</strong></div>
      <div><small>Jour</small><strong>{prettyDate}</strong></div>
      <div><small>Heure</small><strong>{data.time}</strong></div>
      <div><small>Départ</small><strong>{data.address}</strong></div>
    </div>
    <div className="review-box"><label htmlFor="review">Un mot à ajouter&nbsp;?</label><Textarea id="review" value={review} onChange={(event) => { setReview(event.target.value); if (status !== 'idle') setStatus('idle'); }} placeholder="Chaque message négatif écrit ici engage un règlement de comptes sur le parking du Lidl." /><Button className="next-button" onClick={save} disabled={!review.trim() || status === 'sending' || status === 'sent'}>{status === 'sent' ? <><Check /><span>C’est noté</span></> : status === 'sending' ? <span>Envoi…</span> : <><Send /><span>Envoyer</span></>}</Button>{status === 'error' && <p className="form-error">Le message n’est pas parti. Réessaie dans un instant.</p>}<Button variant="ghost" className="restart-button" disabled={status === 'sending'} onClick={() => dispatch(actions.reset())}><RotateCcw /><span>Un autre date&nbsp;?</span></Button></div>
  </section>;
}

function ScenarioInner({ scenarioId }: { scenarioId: string }) {
  const scenario = useMemo(() => getScenario(scenarioId), [scenarioId]);
  const sceneIndex = useSelector((state: RootState) => state.date.scene);
  if (!scenario) return <main className="home-shell"><section className="home-card"><p className="eyebrow">Invitation introuvable</p><h1>Cette adresse ne raconte rien.</h1><p className="home-copy">Vérifie le lien que tu as reçu.</p></section></main>;
  const scene = scenario.flow[Math.min(sceneIndex, scenario.flow.length - 1)];
  const scenes = { invitation: <Invitation guest={scenario.guest} />, schedule: <Schedule />, venue: <Venue />, address: <Address scenario={scenario} />, recap: <Recap scenario={scenario} /> };
  return <Shell>{scenes[scene]}</Shell>;
}

export function ScenarioExperience({ scenarioId }: { scenarioId: string }) {
  return <StoreProvider storageKey={`entre-nous:${scenarioId}`}><ScenarioInner scenarioId={scenarioId} /></StoreProvider>;
}
