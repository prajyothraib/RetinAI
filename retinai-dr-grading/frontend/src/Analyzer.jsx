import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"];
const ADVICE = [
  "No signs of diabetic retinopathy detected. Keep up routine yearly screening.",
  "Early microvascular changes. Keep glucose and blood pressure controlled and re-screen in 6 to 12 months.",
  "Moderate changes. An ophthalmologist evaluation is recommended.",
  "Severe non-proliferative changes. Urgent ophthalmology referral is advised.",
  "Proliferative disease. Seek specialist care immediately.",
];

export default function Analyzer() {
  const input = useRef();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [view, setView] = useState("heat");
  const [drag, setDrag] = useState(false);

  const pick = (f) => {
    if (!f || !f.type.startsWith("image/")) return setErr("Please choose an image file (PNG or JPG).");
    setErr(""); setRes(null); setFile(f); setPreview(URL.createObjectURL(f));
  };

  const run = async () => {
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/predict`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).detail || "Request failed");
      setRes(await r.json()); setView("heat");
    } catch (e) {
      setErr(e.message === "Failed to fetch" ? "Cannot reach the API. Is the backend running on port 8000?" : e.message);
    }
    setBusy(false);
  };

  const shown = res ? (view === "heat" ? res.heatmap : res.processed) : preview;

  return (
    <div className="glass grid gap-6 rounded-[2rem] p-5 md:grid-cols-2 md:p-8">
      {/* left: upload / preview */}
      <div>
        <div
          onClick={() => !busy && input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`relative aspect-square cursor-pointer overflow-hidden rounded-3xl border border-dashed transition ${drag ? "border-neon bg-violet/20" : "border-white/25 bg-black/40 hover:border-violet"}`}
        >
          {shown ? (
            <img src={shown} alt="Retinal scan" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}
                className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet to-neon text-2xl">+</motion.div>
              <p className="font-thin text-lg font-light">Drop a retinal fundus image here</p>
              <p className="text-xs text-white/50">or click to browse. PNG or JPG, up to 15 MB</p>
            </div>
          )}
          {busy && (
            <>
              <div className="absolute inset-0 bg-violet/20" />
              <div className="animate-scan absolute left-0 right-0 h-1 bg-neon shadow-[0_0_24px_6px_#d100ff]" />
            </>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={!file || busy} onClick={run}
            className="rounded-full bg-gradient-to-r from-violet to-neon px-6 py-3 text-sm font-bold transition hover:scale-105 hover:shadow-[0_0_30px_#9303c5] disabled:opacity-40 disabled:hover:scale-100">
            {busy ? "Analyzing..." : "Analyze scan"}
          </button>
          {res && (
            <div className="flex rounded-full border border-white/20 p-1 text-xs">
              {[["heat", "Attention"], ["proc", "Enhanced"]].map(([k, l]) => (
                <button key={k} onClick={() => setView(k)} className={`rounded-full px-3 py-1.5 transition ${view === k ? "bg-white text-ink" : "text-white/70"}`}>{l}</button>
              ))}
            </div>
          )}
        </div>
        {err && <p className="mt-3 text-sm text-pink-300">{err}</p>}
      </div>

      {/* right: results */}
      <div className="flex min-h-[20rem] flex-col justify-center">
        <AnimatePresence mode="wait">
          {!res ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-thin text-2xl font-light text-white/60">
              Your grade, the generated progression and an attention map will appear here.
            </motion.p>
          ) : (
            <motion.div key="res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-xs uppercase tracking-[.25em] text-lilac">Predicted severity</p>
              <div className="flex items-end gap-4">
                <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160 }}
                  className="bg-gradient-to-b from-neon to-violet bg-clip-text text-8xl font-black leading-none text-transparent">{res.grade}</motion.span>
                <h3 className="pb-2 text-3xl font-black">{res.label}</h3>
              </div>
              <p className="mt-3 text-sm text-white/70">{ADVICE[res.grade]}</p>

              <p className="mt-6 text-xs uppercase tracking-[.25em] text-lilac">Generated progression</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[...res.sequence, "end"].map((t, i) => (
                  <motion.span key={t + i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.2 }}
                    className={`rounded-full px-3 py-1 text-xs ${t === "end" ? "border border-white/30 text-white/60" : "bg-violet/30 border border-violet"}`}>{t}</motion.span>
                ))}
              </div>

              <p className="mt-6 text-xs uppercase tracking-[.25em] text-lilac">Grade probabilities</p>
              <div className="mt-2 space-y-2">
                {res.probabilities.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className={`w-24 ${i === res.grade ? "font-bold text-white" : "text-white/60"}`}>{NAMES[i]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ duration: 0.9, delay: 0.2 + i * 0.08 }}
                        className={`h-full rounded-full ${i === res.grade ? "bg-gradient-to-r from-violet to-neon" : "bg-white/30"}`} />
                    </div>
                    <span className="w-10 text-right tabular-nums">{(p * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/50">Decoding confidence {(res.confidence * 100).toFixed(0)}%. {res.disclaimer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
