"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/userId";
import { useQuota } from "@/hooks/useQuota";
import { useRecorder } from "@/hooks/useRecorder";
import { QuotaBar } from "@/components/QuotaBar";
import { RecordButton } from "@/components/RecordButton";
import { JournalEntryCard } from "@/components/JournalEntryCard";
import { WordCloud } from "@/components/WordCloud";
import { ThoughtConstellation } from "@/components/ThoughtConstellation"; // [EXPERIMENTAL]
import { CathartLogo } from "@/components/CathartLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InfoModal } from "@/components/InfoModal";
import type { JournalEntry, ReflectResponse } from "@/types";

type PageState = "idle" | "recording" | "processing" | "reflect-retry" | "done" | "error" | "no-speech";
type View = "journal" | "patterns" | "words";

const TABS: { id: View; label: string }[] = [
  { id: "journal",  label: "Journal"  },
  { id: "patterns", label: "Patterns" },
  { id: "words",    label: "Words"    },
];

const FILTER_PAGE_SIZE = 5;
const JOURNAL_PAGE_SIZE = 10;

export default function Home() {
  const { quota, loading: quotaLoading, refresh: refreshQuota } = useQuota();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState<View>("journal");
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [filterWord, setFilterWord] = useState<string | null>(null);
  const [filterPage, setFilterPage] = useState(0);
  const [journalPage, setJournalPage] = useState(0);
  const pendingRef = useRef<{ transcript: string; durationSeconds: number } | null>(null);

  const quotaLoadedRef = useRef(false);
  useEffect(() => {
    if (!quotaLoadedRef.current) {
      quotaLoadedRef.current = true;
      refreshQuota();
    }
  }, [refreshQuota]);

  // Attach anonymous user ID to Sentry — no PII, just the local UUID
  useEffect(() => {
    Sentry.setUser({ id: getUserId() });
    return () => Sentry.setUser(null);
  }, []);

  const maxSeconds = Math.floor(quota.allowedMinutes * 60);

  const handleViewChange = useCallback((v: View) => {
    setView(v);
    if (v !== "words") {
      setFilterWord(null);
      setFilterPage(0);
    }
    setDeleteAllConfirm(false);
  }, []);

  const runReflectAndSave = useCallback(
    async (transcript: string, durationSeconds: number) => {
      const userId = getUserId();

      let reflection: ReflectResponse;
      try {
        const reflectRes = await fetch("/api/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, userId }),
        });
        if (!reflectRes.ok) {
          const body = await reflectRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Reflection failed");
        }
        reflection = (await reflectRes.json()) as ReflectResponse;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Reflection failed.");
        setPageState("reflect-retry");
        return;
      }

      const entry: JournalEntry = {
        userId, transcript, reflection, durationSeconds, createdAt: new Date(),
      };

      try {
        const id = await db.entries.add(entry);
        setEntries((prev) => [{ ...entry, id: id as number }, ...prev]);
        setJournalPage(0);
      } catch {
        setErrorMsg("Entry could not be saved to your device.");
        setPageState("error");
        return;
      }

      pendingRef.current = null;
      await refreshQuota();
      setPageState("done");
    },
    [refreshQuota]
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      setErrorMsg(null);
      setPageState("processing");
      const userId = getUserId();

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("userId", userId);
      formData.append("durationSeconds", String(durationSeconds));

      let transcript: string;
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const body = await res.json().catch(() => ({}));
        if (res.status === 422) {
          // No speech detected — quota not charged; guide user to re-record
          setErrorMsg((body as { error?: string }).error ?? "No speech detected.");
          setPageState("no-speech");
          return;
        }
        if (!res.ok) {
          throw new Error((body as { error?: string }).error ?? "Transcription failed");
        }
        transcript = (body as { transcript: string }).transcript;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Transcription failed. Please try again.");
        setPageState("error");
        return;
      }

      pendingRef.current = { transcript, durationSeconds };
      await runReflectAndSave(transcript, durationSeconds);
    },
    [runReflectAndSave]
  );

  const recorder = useRecorder({ maxSeconds, onComplete: handleRecordingComplete });

  // Live-adjust quota display during active recording only (not paused, not stopped)
  const liveQuota = useMemo(() => {
    if (recorder.state !== "recording" || recorder.elapsedSeconds === 0) return quota;
    const elapsedMin = recorder.elapsedSeconds / 60;
    return {
      ...quota,
      userRemaining: Math.max(0, quota.userRemaining - elapsedMin),
      userUsed: quota.userUsed + elapsedMin,
    };
  }, [quota, recorder.state, recorder.elapsedSeconds]);

  const filteredEntries = useMemo(() => {
    if (!filterWord) return entries;
    const re = new RegExp(`\\b${filterWord}\\b`, "i");
    return entries.filter((e) => re.test(e.transcript));
  }, [entries, filterWord]);

  const filterPageCount = Math.ceil(filteredEntries.length / FILTER_PAGE_SIZE);
  const paginatedFiltered = filteredEntries.slice(
    filterPage * FILTER_PAGE_SIZE,
    (filterPage + 1) * FILTER_PAGE_SIZE
  );

  const journalPageCount = Math.ceil(entries.length / JOURNAL_PAGE_SIZE);
  const paginatedEntries = entries.slice(
    journalPage * JOURNAL_PAGE_SIZE,
    (journalPage + 1) * JOURNAL_PAGE_SIZE
  );

  useEffect(() => {
    db.entries.orderBy("createdAt").reverse().toArray().then(setEntries).catch(console.error);
  }, []);

  const handleStart = useCallback(async () => {
    setPageState("idle");
    setErrorMsg(null);
    pendingRef.current = null;
    await refreshQuota();
    recorder.reset();
    await recorder.startRecording();
  }, [refreshQuota, recorder]);

  const handleStop     = useCallback(() => recorder.stopRecording(), [recorder]);
  const handlePause    = useCallback(() => recorder.pauseRecording(), [recorder]);
  const handleResume   = useCallback(() => recorder.resumeRecording(), [recorder]);
  const handleSubmit   = useCallback(() => recorder.submitRecording(), [recorder]);
  const handleRerecord = useCallback(() => {
    recorder.reset();
    setPageState("idle");
    setErrorMsg(null);
    pendingRef.current = null;
  }, [recorder]);
  const handleReset    = useCallback(() => {
    recorder.reset();
    setPageState("idle");
    setErrorMsg(null);
    pendingRef.current = null;
  }, [recorder]);

  const handleDeleteEntry = useCallback(async (id: number) => {
    await db.entries.delete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleDeleteAll = useCallback(async () => {
    await db.entries.clear();
    setEntries([]);
    setDeleteAllConfirm(false);
  }, []);

  const handleRetryReflection = useCallback(async () => {
    if (!pendingRef.current) return;
    setErrorMsg(null);
    setPageState("processing");
    const { transcript, durationSeconds } = pendingRef.current;
    await runReflectAndSave(transcript, durationSeconds);
  }, [runReflectAndSave]);

  const isBlocked = quota.isBlocked || maxSeconds <= 0;

  useEffect(() => {
    if (pageState !== "done") return;
    recorder.reset();
    setPageState("idle");
  }, [pageState, recorder]);

  // Reset recorder when no speech was detected (quota was not charged)
  useEffect(() => {
    if (pageState !== "no-speech") return;
    recorder.reset();
  }, [pageState, recorder]);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 py-10 flex flex-col gap-8 flex-1">

        {/* Logo */}
        <header className="flex items-center justify-between pt-2">
          <button
            onClick={() => setShowInfo(true)}
            className="text-stone-500 hover:text-stone-300 transition-colors p-1 rounded-md"
            aria-label="Privacy & usage info"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
          <CathartLogo />
          <ThemeToggle />
        </header>

        {/* Quota bar */}
        <QuotaBar quota={liveQuota} loading={quotaLoading} />

        {/* Record section — always visible */}
        <section className="flex flex-col items-center gap-6">
          <RecordButton
            state={pageState === "processing" ? "processing" : recorder.state}
            elapsedSeconds={recorder.elapsedSeconds}
            remainingSeconds={recorder.remainingSeconds}
            maxSeconds={maxSeconds}
            isBlocked={isBlocked}
            analyserRef={recorder.analyserRef}
            onStart={handleStart}
            onStop={handleStop}
            onPause={handlePause}
            onResume={handleResume}
            onSubmit={handleSubmit}
            onRerecord={handleRerecord}
          />

          {pageState === "reflect-retry" && (
            <div className="space-y-3 text-center max-w-xs">
              <p className="text-amber-400 text-sm">
                Reflection failed — your transcript was captured but the entry hasn&apos;t been saved yet.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleRetryReflection}
                  className="text-sm px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/40 text-teal-400 hover:bg-teal-500/25 transition-colors"
                >
                  Retry reflection
                </button>
                <button onClick={handleReset} className="text-stone-500 text-xs underline underline-offset-2 hover:text-stone-300">
                  Discard
                </button>
              </div>
            </div>
          )}

          {pageState === "no-speech" && (
            <div className="space-y-2 text-center max-w-xs">
              <p className="text-stone-400 text-sm">No speech detected — make sure your microphone is picking up your voice.</p>
              <button onClick={handleReset} className="text-teal-500 text-xs hover:text-teal-400 transition-colors">
                Re-record
              </button>
            </div>
          )}

          {pageState === "error" && errorMsg && (
            <div className="space-y-2 text-center">
              <p className="text-amber-400 text-sm max-w-xs">{errorMsg}</p>
              <button onClick={handleReset} className="text-stone-400 text-xs underline underline-offset-2 hover:text-stone-300">
                Try again
              </button>
            </div>
          )}

          {!quotaLoading && isBlocked && pageState === "idle" && (
            <p className="text-stone-500 text-sm text-center max-w-xs">
              Today&apos;s reflection limit has been reached. Your entries are saved locally. Try again tomorrow.
            </p>
          )}
        </section>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <nav className="flex rounded-xl bg-stone-900 border border-stone-800 p-1 gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleViewChange(tab.id)}
              className={[
                "flex-1 py-2 text-xs rounded-lg transition-colors font-medium",
                view === tab.id
                  ? "bg-stone-800 text-stone-100"
                  : "text-stone-500 hover:text-stone-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Tab content ─────────────────────────────────────────────────── */}

        {/* JOURNAL tab */}
        {view === "journal" && (
          <section className="space-y-3">
            {entries.length > 0 ? (
              <>
                <h2 className="text-stone-400 text-xs uppercase tracking-widest">Past entries</h2>

                <div className="space-y-2">
                  {paginatedEntries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id ?? String(entry.createdAt)}
                      entry={entry}
                      onDelete={entry.id != null ? () => handleDeleteEntry(entry.id!) : undefined}
                    />
                  ))}
                </div>

                {/* Journal pagination */}
                {journalPageCount > 1 && (
                  <div className="flex items-center justify-center gap-5 pt-1">
                    <button
                      onClick={() => setJournalPage((p) => Math.max(0, p - 1))}
                      disabled={journalPage === 0}
                      className="text-xs text-stone-400 hover:text-stone-200 disabled:text-stone-700 disabled:cursor-default transition-colors"
                    >
                      ← prev
                    </button>
                    <span className="text-stone-500 text-xs">{journalPage + 1} / {journalPageCount}</span>
                    <button
                      onClick={() => setJournalPage((p) => Math.min(journalPageCount - 1, p + 1))}
                      disabled={journalPage >= journalPageCount - 1}
                      className="text-xs text-stone-400 hover:text-stone-200 disabled:text-stone-700 disabled:cursor-default transition-colors"
                    >
                      next →
                    </button>
                  </div>
                )}

                {/* Delete all */}
                {deleteAllConfirm ? (
                  <div className="pt-1 flex items-center justify-center gap-4">
                    <p className="text-stone-600 text-xs">
                      Delete all {entries.length} {entries.length === 1 ? "entry" : "entries"}?
                    </p>
                    <button onClick={handleDeleteAll} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => setDeleteAllConfirm(false)} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteAllConfirm(true)}
                    className="w-full pt-1 text-xs text-stone-600 hover:text-stone-400 transition-colors text-center"
                  >
                    Delete all entries
                  </button>
                )}
              </>
            ) : (
              !quotaLoading && pageState === "idle" && (
                <p className="text-stone-500 text-sm text-center py-4">
                  No entries yet. Press record to begin.
                </p>
              )
            )}
          </section>
        )}

        {/* WORDS tab */}
        {view === "words" && (
          <section className="space-y-4">
            {entries.length > 0 ? (
              <>
                <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
                  <WordCloud
                    entries={entries}
                    selectedWord={filterWord}
                    onWordClick={(word) => {
                      setFilterWord((prev) => (prev === word ? null : word));
                      setFilterPage(0);
                    }}
                  />
                </div>

                {/* Word filter results */}
                {filterWord && (
                  <>
                    <div className="flex items-center justify-between rounded-xl bg-stone-900 border border-stone-800 px-3 py-2">
                      <p className="text-stone-400 text-xs">
                        Entries mentioning{" "}
                        <span className="text-teal-400 font-medium">&ldquo;{filterWord}&rdquo;</span>
                        {" "}— {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                      </p>
                      <button
                        onClick={() => { setFilterWord(null); setFilterPage(0); }}
                        className="text-stone-500 hover:text-stone-300 text-xs transition-colors ml-4"
                      >
                        clear
                      </button>
                    </div>

                    <div className="space-y-2">
                      {paginatedFiltered.map((entry) => (
                        <JournalEntryCard
                          key={entry.id ?? String(entry.createdAt)}
                          entry={entry}
                        />
                      ))}
                      {filteredEntries.length === 0 && (
                        <p className="text-stone-500 text-sm text-center py-4">
                          No entries found for &ldquo;{filterWord}&rdquo;.
                        </p>
                      )}
                    </div>

                    {filterPageCount > 1 && (
                      <div className="flex items-center justify-center gap-5">
                        <button
                          onClick={() => setFilterPage((p) => Math.max(0, p - 1))}
                          disabled={filterPage === 0}
                          className="text-xs text-stone-400 hover:text-stone-200 disabled:text-stone-700 disabled:cursor-default transition-colors"
                        >
                          ← prev
                        </button>
                        <span className="text-stone-500 text-xs">{filterPage + 1} / {filterPageCount}</span>
                        <button
                          onClick={() => setFilterPage((p) => Math.min(filterPageCount - 1, p + 1))}
                          disabled={filterPage >= filterPageCount - 1}
                          className="text-xs text-stone-400 hover:text-stone-200 disabled:text-stone-700 disabled:cursor-default transition-colors"
                        >
                          next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-stone-500 text-sm text-center py-4">
                No entries yet — record something to see themes.
              </p>
            )}
          </section>
        )}

        {/* PATTERNS tab */}
        {view === "patterns" && (
          <section>
            <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4">
              <ThoughtConstellation entries={entries} />
            </div>
          </section>
        )}

      </div>

      <footer className="py-4 text-center">
        <p className="text-stone-600 text-xs">All entries stored only on this device.</p>
      </footer>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </main>
  );
}
