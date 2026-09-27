"use client";

import { useState } from "react";
import { AudioLines, Check, LockKeyhole, Trash2 } from "lucide-react";

export function ReportAudioControl({
  canSelect,
  recordedAt,
  duration,
  reason,
}: {
  canSelect: boolean;
  recordedAt: string;
  duration: string;
  reason: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [selected, setSelected] = useState(false);

  if (!canSelect) {
    return (
      <section className="report-audio-control is-locked">
        <LockKeyhole size={18} />
        <div><h2>Public pitch audio</h2><p>{reason}</p></div>
        <button type="button" disabled>Choose recording</button>
      </section>
    );
  }

  if (selected) {
    return (
      <section className="report-audio-control is-selected" role="status">
        <Check size={18} />
        <div><h2>Pitch audio selected</h2><p>Signed-in investors can hear the pitch segment. The answer and coaching report remain private.</p></div>
        <button type="button" onClick={() => setSelected(false)}><Trash2 size={14} /> Remove</button>
      </section>
    );
  }

  return (
    <section className="report-audio-control">
      <AudioLines size={18} />
      <div><h2>Public pitch audio</h2><p>Choose this pitch segment only. The answer and coaching report stay private.</p></div>
      {confirming ? (
        <div className="audio-confirmation">
          <strong>{recordedAt} · {duration}</strong>
          <p>Signed-in investors will be able to hear this pitch. Your Q&amp;A and feedback stay private.</p>
          <div><button type="button" onClick={() => setSelected(true)}>Confirm selection</button><button type="button" onClick={() => setConfirming(false)}>Cancel</button></div>
        </div>
      ) : <button type="button" onClick={() => setConfirming(true)}>Choose recording</button>}
    </section>
  );
}
