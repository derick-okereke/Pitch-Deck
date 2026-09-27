"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CaptureState = "idle" | "requesting" | "ready" | "recording" | "stopped" | "denied" | "unsupported" | "error";

function readableMediaError(error: unknown) {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
    return "Microphone access is blocked. Allow it in your browser’s site settings, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") return "No microphone was found. Connect one, then try again.";
  return "The microphone could not start. Check that another app is not using it, then try again.";
}

export function useAudioCapture() {
  const [state, setState] = useState<CaptureState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("Microphone has not been checked yet.");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  const stopMeter = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setLevel(0);
  }, []);

  const closeInput = useCallback(() => {
    stopMeter();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    contextRef.current = null;
  }, [stopMeter]);

  const release = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    closeInput();
  }, [closeInput]);

  useEffect(() => release, [release]);

  const meter = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    context.createMediaStreamSource(stream).connect(analyser);
    const values = new Uint8Array(analyser.frequencyBinCount);
    contextRef.current = context;

    let lastPaint = 0;
    const sample = (now: number) => {
      analyser.getByteFrequencyData(values);
      if (now - lastPaint > 70) {
        const energy = values.reduce((sum, value) => sum + value, 0) / values.length / 255;
        setLevel(Math.min(1, energy * 2.8));
        lastPaint = now;
      }
      frameRef.current = requestAnimationFrame(sample);
    };
    frameRef.current = requestAnimationFrame(sample);
  }, []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("unsupported");
      setMessage("This browser cannot record audio. Use current Chrome, Edge, or Safari on a secure connection.");
      return false;
    }

    release();
    setState("requesting");
    setMessage("Waiting for microphone permission…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current !== stream) return;
          streamRef.current = null;
          stopMeter();
          void contextRef.current?.close();
          contextRef.current = null;
          setState("error");
          setMessage("The microphone disconnected. Reconnect it and start this recording again.");
        };
      });
      meter(stream);
      setState("ready");
      setMessage("Microphone is ready. Your audio stays in this browser during the fixture flow.");
      return true;
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      setState(denied ? "denied" : "error");
      setMessage(readableMediaError(error));
      return false;
    }
  }, [meter, release, stopMeter]);

  const start = useCallback(async () => {
    let stream = streamRef.current;
    if (!stream || !stream.active) {
      const ready = await request();
      if (!ready) return false;
      stream = streamRef.current;
    }
    if (!stream) return false;

    chunksRef.current = [];
    setElapsed(0);
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }) : null;
      recorderRef.current = null;
      closeInput();
      setState("stopped");
      setMessage(blob ? "Audio captured locally. The microphone is now off." : "No usable audio was captured. The microphone is now off.");
      resolveStopRef.current?.(blob);
      resolveStopRef.current = null;
    };
    recorder.start(500);
    intervalRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
    setState("recording");
    setMessage("Recording in progress.");
    return true;
  }, [closeInput, request]);

  const stop = useCallback(() => new Promise<Blob | null>((resolve) => {
    if (!recorderRef.current || recorderRef.current.state !== "recording") {
      resolve(null);
      return;
    }
    resolveStopRef.current = resolve;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    recorderRef.current.stop();
  }), []);

  return { state, level, elapsed, message, request, start, stop, release };
}
