import { lazy, Suspense, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useInView, animate, useReducedMotion } from "framer-motion";
import Analyzer from "./Analyzer";

const Scene3D = lazy(() => import("./Scene3D"));

const up = (d = 0) => ({ initial: { opacity: 0, y: 32 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.7, delay: d } });

function Tilt({ children, className = "" }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [9, -9]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-9, 9]), { stiffness: 200, damping: 20 });
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width - 0.5); y.set((e.clientY - r.top) / r.height - 0.5); }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >{children}</motion.div>
  );
}

function Count({ to, dec = 0 }) {
  const ref = useRef();
  const seen = useInView(ref, { once: true });
  useEffect(() => {
    if (!seen) return;
    const c = animate(0, to, { duration: 1.6, ease: "easeOut", onUpdate: (v) => { ref.current.textContent = v.toFixed(dec); } });
    return () => c.stop();
  }, [seen]);
  return <span ref={ref}>0</span>;
}

const WORDS = ["APTOS 2019", "EfficientNet-B0", "LSTM decoder", "Attention maps", "Teacher forcing", "SDG 3 Good Health", "Quadratic Weighted Kappa", "Ben Graham enhancement"];

export default function App() {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      {/* floating pill nav */}
      <motion.nav initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7 }}
        className="fixed inset-x-0 top-4 z-50 mx-auto flex w-[92%] max-w-5xl items-center justify-between">
        <a href="#top" className="flex items-center gap-2 text-sm font-bold"><span className="text-xl text-neon">✦</span>Retin<span className="text-neon">AI</span></a>
        <div className="glass hidden items-center gap-1 rounded-full p-1 text-[11px] sm:flex">
          <a href="#top" className="rounded-full bg-white px-4 py-1.5 font-bold text-ink">Home</a>
          {[["#analyze", "Analyze"], ["#how", "How it works"], ["#about", "About"]].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full px-4 py-1.5 transition hover:bg-white/10">{l}</a>
          ))}
        </div>
        <a href="#analyze" className="rounded-full bg-gradient-to-r from-violet to-neon px-4 py-2 text-[11px] font-bold transition hover:scale-105">Try it now</a>
      </motion.nav>

      {/* hero */}
      <section id="top" className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-16 pt-32 md:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.div {...up()} className="flex flex-wrap gap-2">
            {["SDG 3 Health", "CNN + LSTM", "Explainable AI", "APTOS 2019"].map((t) => <span key={t} className="pill-tag">{t}</span>)}
          </motion.div>
          <motion.h1 {...up(0.1)} className="mt-6 text-5xl font-black uppercase leading-[.95] sm:text-7xl">
            <span className="outline-text block">Detect early.</span>
            <span className="block text-neon">Protect sight.</span>
          </motion.h1>
          <motion.p {...up(0.2)} className="mt-6 max-w-md text-sm text-white/75">
            Upload a retinal fundus photo and get a diabetic retinopathy severity grade, the generated disease progression and an attention map showing where the model looked.
          </motion.p>
          <motion.div {...up(0.3)} className="mt-8 flex flex-wrap gap-3">
            <a href="#analyze" className="rounded-full bg-gradient-to-r from-violet to-neon px-6 py-3 text-sm font-bold transition hover:scale-105 hover:shadow-[0_0_30px_#9303c5]">Analyze a scan</a>
            <a href="#how" className="rounded-full border border-white/30 px-6 py-3 text-sm transition hover:bg-white/10">How it works</a>
          </motion.div>
        </div>
        <motion.div {...up(0.2)} className="relative h-80 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet via-[#3a0556] to-ink md:h-[26rem]">
          {!reduce && <div className="hidden h-full md:block"><Suspense fallback={null}><Scene3D /></Suspense></div>}
          {(reduce || true) && <div className="grid h-full place-items-center text-7xl text-neon md:hidden">✦</div>}
        </motion.div>
      </section>

      {/* marquee + stats */}
      <div className="overflow-hidden border-y border-white/10 py-4">
        <div className="animate-marquee flex w-max gap-12 whitespace-nowrap font-thin text-xl font-light text-white/70">
          {[...WORDS, ...WORDS].map((w, i) => <span key={i}>{w} <span className="ml-12 text-neon">✦</span></span>)}
        </div>
      </div>
      <section className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-5 py-16 text-center">
        {[[0.91, 2, "Validation QWK"], [5, 0, "Severity grades"], [3662, 0, "Training images"]].map(([n, d, l], i) => (
          <motion.div key={l} {...up(i * 0.1)}>
            <p className="text-3xl font-black sm:text-6xl"><Count to={n} dec={d} /></p>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-lilac">{l}</p>
          </motion.div>
        ))}
      </section>

      {/* analyzer */}
      <section id="analyze" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-12">
        <motion.h2 {...up()} className="mb-8 text-3xl font-black uppercase sm:text-5xl">Analyze a <span className="text-neon">scan</span></motion.h2>
        <motion.div {...up(0.1)}><Analyzer /></motion.div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
        <motion.h2 {...up()} className="mb-8 text-3xl font-black uppercase sm:text-5xl">How it <span className="outline-text">works</span></motion.h2>
        <div className="grid gap-5 md:grid-cols-3" style={{ perspective: 1000 }}>
          {[
            ["01", "Preprocess", "Black borders are cropped, the image is squared, resized and Ben Graham enhanced to make lesions stand out."],
            ["02", "CNN encoder", "EfficientNet-B0 turns the retina into a grid of feature vectors, one per image region."],
            ["03", "LSTM decoder", "An attention LSTM generates the progression (mild, moderate...) until it stops. The count is the grade."],
          ].map(([n, t, d], i) => (
            <motion.div key={n} {...up(i * 0.12)}>
              <Tilt className="grad-card h-full rounded-3xl p-6 shadow-[0_20px_60px_-20px_#9303c5]">
                <p className="font-thin text-5xl font-extralight text-white/40">{n}</p>
                <h3 className="mt-6 text-xl font-black uppercase">{t}</h3>
                <p className="mt-2 text-sm text-white/80">{d}</p>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </section>

      {/* about / footer */}
      <footer id="about" className="relative mt-10 overflow-hidden px-5 pb-10 pt-16 text-center">
        <p className="mx-auto max-w-xl text-sm text-white/70">
          RetinAI is a research prototype trained on the public APTOS 2019 dataset. It is a screening-support demo, not a medical device, and it does not replace an eye examination.
        </p>
        <p className="outline-thin font-thin mt-6 select-none text-[22vw] font-extralight leading-none">RETINAI</p>
        <p className="mt-2 text-xs text-white/40">Aligned with SDG 3: Good Health and Well-being</p>
      </footer>
    </div>
  );
}
