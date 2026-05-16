'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import { MementoLogo } from '@/components/layout/MementoLogo';
import {
  ArrowLeft,
  Cloud,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SyncSprite } from '@/components/layout/Sprite';

const HUB_URL = 'https://memento-hub.vercel.app';
const SYNC_TOKEN_KEY = 'memento-sync-token';

type SyncState = 'idle' | 'requesting' | 'authorizing' | 'success' | 'error';

interface DeviceCodeData {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export default function SyncPage() {
  const t = useT();
  const prefix = useLocalePrefix();
  const router = useRouter();

  const [state, setState] = useState<SyncState>('idle');
  const [deviceCodeData, setDeviceCodeData] = useState<DeviceCodeData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tokenAlreadyExists, setTokenAlreadyExists] = useState(false);
  const abortRef = useRef(false);

  // Check if already has token
  useEffect(() => {
    const token = localStorage.getItem(SYNC_TOKEN_KEY);
    if (token) {
      setTokenAlreadyExists(true);
    }
  }, []);

  // Countdown timer for code expiration
  useEffect(() => {
    if (state !== 'authorizing' || !deviceCodeData) return;

    setSecondsLeft(deviceCodeData.expires_in);
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setState('error');
          setError(t.sync.errorExpired);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, deviceCodeData, t.sync.errorExpired]);

  const pollForToken = useCallback(
    async (deviceCode: string, interval: number) => {
      let pollInterval = interval;
      let consecutiveServerErrors = 0;
      const MAX_CONSECUTIVE_SERVER_ERRORS = 10;

      for (let attempt = 0; attempt < 200; attempt++) {
        if (abortRef.current) return;

        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, pollInterval * 1000));
        }

        try {
          const res = await fetch(`${HUB_URL}/api/v1/auth/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_code: deviceCode }),
          });

          if (res.ok) {
            const token = await res.json();
            // Store token in localStorage
            localStorage.setItem(
              SYNC_TOKEN_KEY,
              JSON.stringify({
                accessToken: token.access_token,
                tokenType: token.token_type,
                storedAt: Date.now(),
                serverUrl: HUB_URL,
              })
            );
            setState('success');
            return;
          }

          const err = await res.json().catch(() => ({ error: 'server_error' }));

          switch (err.error) {
            case 'authorization_pending':
              consecutiveServerErrors = 0;
              continue;
            case 'slow_down':
              consecutiveServerErrors = 0;
              pollInterval += 5;
              continue;
            case 'expired_token':
              setState('error');
              setError(t.sync.errorExpired);
              return;
            case 'access_denied':
              setState('error');
              setError(t.sync.errorDenied);
              return;
            default:
              // Transient server errors — keep polling with backoff
              consecutiveServerErrors++;
              if (consecutiveServerErrors >= MAX_CONSECUTIVE_SERVER_ERRORS) {
                setState('error');
                setError(t.sync.errorNetwork);
                return;
              }
              // Add progressive backoff for server errors (cap at 30s)
              pollInterval = Math.min(pollInterval + 2, 30);
              continue;
          }
        } catch {
          // Network error — retry with backoff
          consecutiveServerErrors++;
          if (consecutiveServerErrors >= MAX_CONSECUTIVE_SERVER_ERRORS) {
            setState('error');
            setError(t.sync.errorNetwork);
            return;
          }
          continue;
        }
      }

      setState('error');
      setError(t.sync.errorExpired);
    },
    [t]
  );

  async function startDeviceFlow() {
    setState('requesting');
    setError('');

    try {
      const res = await fetch(`${HUB_URL}/api/v1/auth/device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: DeviceCodeData = await res.json();
      setDeviceCodeData(data);
      setState('authorizing');

      // Start polling
      pollForToken(data.device_code, data.interval);
    } catch {
      setState('error');
      setError(t.sync.errorNetwork);
    }
  }

  function copyCode() {
    if (!deviceCodeData) return;
    navigator.clipboard.writeText(deviceCodeData.user_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openVerificationUrl() {
    if (!deviceCodeData) return;
    // Server returns relative path like "/auth/device"
    const url = deviceCodeData.verification_uri.startsWith('http')
      ? deviceCodeData.verification_uri
      : `${HUB_URL}${deviceCodeData.verification_uri}`;
    window.open(url, '_blank');
  }

  function goBack() {
    abortRef.current = true;
    router.push(`${prefix}/dashboard`);
  }

  function retry() {
    setState('idle');
    setError('');
    setDeviceCodeData(null);
    setCopied(false);
  }

  function disconnect() {
    localStorage.removeItem(SYNC_TOKEN_KEY);
    setTokenAlreadyExists(false);
    setState('idle');
  }

  // ─── Already connected state ──────────────────────────
  if (tokenAlreadyExists && state === 'idle') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <MementoLogo size={48} showText={false} />
          </div>

          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {t.sync.connectedTitle}
            </h1>
            <p className="text-[14px] text-[var(--color-secondary)]">
              {t.sync.connectedDescription}
            </p>

            <a
              href={HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              {t.sync.openHub}
            </a>

            <button
              onClick={disconnect}
              className="w-full py-2.5 px-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors text-[14px]"
            >
              {t.sync.disconnect}
            </button>
          </div>

          <button
            onClick={goBack}
            className="flex items-center gap-2 mx-auto mt-6 text-[14px] text-[var(--color-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.sync.goBack}
          </button>
        </div>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────
  if (state === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <MementoLogo size={48} showText={false} />
          </div>

          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {t.sync.successTitle}
            </h1>
            <p className="text-[14px] text-[var(--color-secondary)]">{t.sync.successDescription}</p>

            <a
              href={HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              {t.sync.openHub}
            </a>
          </div>

          <button
            onClick={goBack}
            className="flex items-center gap-2 mx-auto mt-6 text-[14px] text-[var(--color-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.sync.goBack}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main flow (idle / requesting / authorizing / error) ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <SyncSprite />
        </div>
        {/*
        <div className="flex justify-center mb-8">
          <MementoLogo size={48} showText={false} />
        </div>
        */}

        {/* Card */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] text-center mb-2">
            {t.sync.pageTitle}
          </h1>
          <p className="text-[14px] text-[var(--color-secondary)] text-center mb-6">
            {t.sync.pageDescription}
          </p>

          {/* Error banner */}
          {state === 'error' && (
            <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── IDLE: Start button ─────────────────────── */}
          {state === 'idle' && (
            <button
              onClick={startDeviceFlow}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <Cloud className="w-4 h-4" />
              {t.sync.startButton}
            </button>
          )}

          {/* ── REQUESTING: Loading ────────────────────── */}
          {state === 'requesting' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
              <p className="text-[14px] text-[var(--color-secondary)]">{t.sync.requestingCode}</p>
            </div>
          )}

          {/* ── AUTHORIZING: Show code + polling ───────── */}
          {state === 'authorizing' && deviceCodeData && (
            <div className="space-y-5">
              {/* User code */}
              <div className="text-center space-y-2">
                <p className="text-[13px] text-[var(--color-secondary)]">{t.sync.enterCodeLabel}</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-mono font-bold tracking-[0.2em] text-[var(--color-text-primary)] bg-[var(--color-neutral-bg)] px-4 py-2 rounded-[var(--radius-sm)]">
                    {deviceCodeData.user_code}
                  </code>
                  <button
                    onClick={copyCode}
                    className="p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
                    title={t.sync.copyCode}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-[var(--color-secondary)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Verification link */}
              <button
                onClick={openVerificationUrl}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t.sync.openVerification}
              </button>

              {/* Polling status */}
              <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--color-tertiary)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.sync.waitingForAuth}
              </div>

              {/* Countdown */}
              <p className="text-center text-[12px] text-[var(--color-tertiary)]">
                {t.sync.expiresIn.replace('{seconds}', String(Math.floor(secondsLeft / 60)))}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </p>
            </div>
          )}

          {/* ── ERROR: Retry ──────────────────────────── */}
          {state === 'error' && (
            <button
              onClick={retry}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              {t.sync.retryButton}
            </button>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 mx-auto mt-6 text-[14px] text-[var(--color-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.sync.goBack}
        </button>
      </div>
    </div>
  );
}
