"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { RecordingState } from "@/types";

interface UseRecorderOptions {
  maxSeconds: number;
  onComplete: (blob: Blob, durationSeconds: number) => void;
}

export function useRecorder({ maxSeconds, onComplete }: UseRecorderOptions) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const durationRef = useRef<number>(0); // seconds at stop time
  const startTimeRef = useRef<number>(0);
  const pausedMsRef = useRef<number>(0); // total ms spent paused
  const pauseStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const getElapsedSeconds = useCallback(() => {
    return Math.round((Date.now() - startTimeRef.current - pausedMsRef.current) / 1000);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearTimers();
  }, [clearTimers]);

  const pauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    mr.pause();
    pauseStartRef.current = Date.now();
    clearTimers();
    setElapsedSeconds(getElapsedSeconds());
    setState("paused");
  }, [clearTimers, getElapsedSeconds]);

  const resumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "paused") return;
    pausedMsRef.current += Date.now() - pauseStartRef.current;
    mr.resume();
    setState("recording");

    timerRef.current = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);

    const remainingMs = (maxSeconds - getElapsedSeconds()) * 1000;
    if (remainingMs > 0) {
      autoStopRef.current = setTimeout(stopRecording, remainingMs);
    } else {
      stopRecording();
    }
  }, [getElapsedSeconds, maxSeconds, stopRecording]);

  const startRecording = useCallback(async () => {
    if (maxSeconds <= 0) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState("error");
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    chunksRef.current = [];
    blobRef.current = null;
    pausedMsRef.current = 0;
    pauseStartRef.current = 0;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;

      const elapsed = getElapsedSeconds();
      durationRef.current = elapsed;
      blobRef.current = new Blob(chunksRef.current, { type: mimeType });
      setElapsedSeconds(elapsed);
      setState("stopped");
    };

    recorder.start(250);
    startTimeRef.current = Date.now();
    setState("recording");
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);

    autoStopRef.current = setTimeout(() => {
      stopRecording();
    }, maxSeconds * 1000);
  }, [maxSeconds, getElapsedSeconds, stopRecording]);

  // Called by user explicitly — only this triggers transcription & quota charge
  const submitRecording = useCallback(() => {
    if (!blobRef.current) return;
    setState("processing");
    onComplete(blobRef.current, durationRef.current);
  }, [onComplete]);

  const reset = useCallback(() => {
    clearTimers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setState("idle");
    setElapsedSeconds(0);
    chunksRef.current = [];
    blobRef.current = null;
    durationRef.current = 0;
    pausedMsRef.current = 0;
    pauseStartRef.current = 0;
    analyserRef.current = null;
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      audioCtxRef.current?.close();
    };
  }, [clearTimers]);

  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);

  return {
    state,
    setState,
    elapsedSeconds,
    remainingSeconds,
    analyserRef,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    submitRecording,
    reset,
  };
}
