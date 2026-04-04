import { useState, useEffect, useRef, useCallback } from "react";

// --- Zeta function computation utilities ---

// Compute zeta on the critical line using Riemann-Siegel inspired approximation
function zetaCriticalLine(t, terms = 200) {
  let realPart = 0;
  let imagPart = 0;
  for (let n = 1; n <= terms; n++) {
    const logN = Math.log(n);
    const angle = -t * logN;
    const mag = 1 / Math.sqrt(n); // n^(-1/2) since real part = 1/2
    realPart += mag * Math.cos(angle);
    imagPart += mag * Math.sin(angle);
  }
  return { re: realPart, im: imagPart };
}

function zetaMagnitude(t, terms = 200) {
  const z = zetaCriticalLine(t, terms);
  return Math.sqrt(z.re * z.re + z.im * z.im);
}

// Known non-trivial zeros (imaginary parts, all have real part = 1/2)
const KNOWN_ZEROS = [
  14.1347, 21.022, 25.0109, 30.4249, 32.9351,
  37.5862, 40.9187, 43.3271, 48.0052, 49.7738,
  52.9703, 56.4462, 59.347, 60.8318, 65.1125,
  67.0798, 69.5464, 72.0672, 75.7047, 77.1448,
  79.3374, 82.9104, 84.7355, 87.4253, 88.8091,
  92.4919, 94.6513, 95.8706, 98.8312, 101.318
];

// Simple prime sieve
function sieveOfEratosthenes(limit) {
  const sieve = new Array(limit + 1).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) sieve[j] = false;
    }
  }
  const primes = [];
  for (let i = 2; i <= limit; i++) if (sieve[i]) primes.push(i);
  return primes;
}

// Prime counting function π(x)
function primeCountingFunction(x, primes) {
  let count = 0;
  for (const p of primes) {
    if (p > x) break;
    count++;
  }
  return count;
}

// Li(x) - logarithmic integral via Simpson's rule (fixed 200 intervals, fast at any x)
function li(x) {
  if (x <= 2) return 0;
  const n = 200; // fixed interval count — no blowup at large x
  const h = (x - 2) / n;
  const f = (t) => 1 / Math.log(t);
  let sum = f(2) + f(x);
  for (let i = 1; i < n; i++) {
    const t = 2 + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * f(t);
  }
  return (h / 3) * sum;
}

// --- Canvas drawing utilities ---
function drawGrid(ctx, w, h, xMin, xMax, yMin, yMax, color = "rgba(255,255,255,0.06)") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  const xStep = Math.pow(10, Math.floor(Math.log10((xMax - xMin) / 5)));
  const yStep = Math.pow(10, Math.floor(Math.log10((yMax - yMin) / 5)));

  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    const px = ((x - xMin) / (xMax - xMin)) * w;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    const py = h - ((y - yMin) / (yMax - yMin)) * h;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }
}

function drawAxisLabels(ctx, w, h, xMin, xMax, yMin, yMax, xLabel, yLabel) {
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "11px 'DM Mono', monospace";
  ctx.textAlign = "center";

  const xStep = Math.pow(10, Math.floor(Math.log10((xMax - xMin) / 5)));
  const nicestep = [1, 2, 5, 10, 20, 50].find(s => (xMax - xMin) / s <= 12) || xStep;
  for (let x = Math.ceil(xMin / nicestep) * nicestep; x <= xMax; x += nicestep) {
    const px = ((x - xMin) / (xMax - xMin)) * w;
    ctx.fillText(x.toFixed(x % 1 === 0 ? 0 : 1), px, h - 4);
  }

  ctx.textAlign = "left";
  const yFallback = Math.pow(10, Math.floor(Math.log10((yMax - yMin) / 5)));
  const yNice = [1, 2, 5, 10, 20, 50, 100].find(s => (yMax - yMin) / s <= 8) || yFallback;
  for (let y = Math.ceil(yMin / yNice) * yNice; y <= yMax; y += yNice) {
    const py = h - ((y - yMin) / (yMax - yMin)) * h;
    ctx.fillText(y.toFixed(y % 1 === 0 ? 0 : 1), 4, py - 3);
  }

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "10px 'DM Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(xLabel, w / 2, h - 16);
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

// --- Components ---

function ZetaMagnitudePlot({ tRange, highlightT }) {
  const canvasRef = useRef(null);
  const [tMin, tMax] = tRange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    const steps = 600;
    const dt = (tMax - tMin) / steps;
    const values = [];
    for (let i = 0; i <= steps; i++) {
      const t = tMin + i * dt;
      values.push({ t, mag: zetaMagnitude(t) });
    }

    const maxMag = Math.max(...values.map(v => v.mag), 4);
    const yMax = maxMag * 1.1;

    drawGrid(ctx, w, h, tMin, tMax, 0, yMax);
    drawAxisLabels(ctx, w, h, tMin, tMax, 0, yMax, "t (imaginary part)", "|ζ(½+it)|");

    // Plot magnitude curve with gradient
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / steps) * w;
      const y = h - (v.mag / yMax) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(125, 211, 252, 0.15)");
    grad.addColorStop(1, "rgba(125, 211, 252, 0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Zero line
    ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Mark known zeros in range
    const zerosInRange = KNOWN_ZEROS.filter(z => z >= tMin && z <= tMax);
    zerosInRange.forEach(z => {
      const x = ((z - tMin) / (tMax - tMin)) * w;
      // Vertical line at zero
      ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Diamond marker
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(x, h - 8);
      ctx.lineTo(x + 5, h - 14);
      ctx.moveTo(x, h - 8);
      ctx.lineTo(x - 5, h - 14);
      ctx.lineTo(x, h - 20);
      ctx.lineTo(x + 5, h - 14);
      ctx.fill();

      // Label
      ctx.fillStyle = "rgba(251, 191, 36, 0.8)";
      ctx.font = "9px 'DM Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(z.toFixed(2), x, h - 24);
    });

    // Highlight hover
    if (highlightT !== null && highlightT >= tMin && highlightT <= tMax) {
      const x = ((highlightT - tMin) / (tMax - tMin)) * w;
      const mag = zetaMagnitude(highlightT);
      const y = h - (mag / yMax) * h;

      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "11px 'DM Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`t=${highlightT.toFixed(2)}  |ζ|=${mag.toFixed(3)}`, x + 8, y - 6);
    }
  }, [tMin, tMax, highlightT]);

  return <canvas ref={canvasRef} width={800} height={300} style={{ width: "100%", height: "auto", borderRadius: 8 }} />;
}

function CriticalStripPlot({ tRange }) {
  const canvasRef = useRef(null);
  const [tMin, tMax] = tRange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    const reMin = -1;
    const reMax = 2;

    // Critical strip shading (0 < Re < 1)
    const x0 = ((0 - reMin) / (reMax - reMin)) * w;
    const x1 = ((1 - reMin) / (reMax - reMin)) * w;
    ctx.fillStyle = "rgba(125, 211, 252, 0.05)";
    ctx.fillRect(x0, 0, x1 - x0, h);

    // Critical line (Re = 1/2)
    const xHalf = ((0.5 - reMin) / (reMax - reMin)) * w;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xHalf, 0);
    ctx.lineTo(xHalf, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Re = ½", xHalf, 14);
    ctx.fillText("(critical line)", xHalf, 26);

    drawGrid(ctx, w, h, reMin, reMax, tMin, tMax, "rgba(255,255,255,0.04)");

    // Plot zeros as glowing dots
    const zerosInRange = KNOWN_ZEROS.filter(z => z >= tMin && z <= tMax);
    zerosInRange.forEach(z => {
      const x = xHalf; // All on Re = 1/2
      const y = h - ((z - tMin) / (tMax - tMin)) * h;

      // Glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 16);
      grd.addColorStop(0, "rgba(251, 191, 36, 0.6)");
      grd.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(x - 16, y - 16, 32, 32);

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();

      // T label
      ctx.fillStyle = "rgba(251, 191, 36, 0.7)";
      ctx.font = "9px 'DM Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`t=${z.toFixed(2)}`, x + 10, y + 3);
    });

    // Axes labels
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Real part (σ)", w / 2, h - 6);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Imaginary part (t)", 0, 0);
    ctx.restore();

    // Strip labels
    ctx.fillStyle = "rgba(125, 211, 252, 0.3)";
    ctx.font = "9px 'DM Mono', monospace";
    ctx.fillText("critical strip", (x0 + x1) / 2, h - 18);
  }, [tMin, tMax]);

  return <canvas ref={canvasRef} width={300} height={500} style={{ width: "100%", height: "auto", borderRadius: 8 }} />;
}

function PrimeDistributionPlot({ maxN }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    const primes = sieveOfEratosthenes(maxN);
    const steps = 300;
    const dx = maxN / steps;

    const piValues = [];
    const liValues = [];
    const approxValues = [];

    for (let i = 1; i <= steps; i++) {
      const x = i * dx;
      piValues.push(primeCountingFunction(x, primes));
      liValues.push(li(x));
      approxValues.push(x > 1 ? x / Math.log(x) : 0);
    }

    const yMax = Math.max(...piValues, ...liValues) * 1.1;

    drawGrid(ctx, w, h, 0, maxN, 0, yMax);
    drawAxisLabels(ctx, w, h, 0, maxN, 0, yMax, "n", "count of primes ≤ n");

    // x/ln(x) approximation
    ctx.beginPath();
    approxValues.forEach((v, i) => {
      const x = ((i + 1) / steps) * w;
      const y = h - (v / yMax) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(167, 139, 250, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Li(x)
    ctx.beginPath();
    liValues.forEach((v, i) => {
      const x = ((i + 1) / steps) * w;
      const y = h - (v / yMax) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(52, 211, 153, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // π(x) - actual step function
    ctx.beginPath();
    piValues.forEach((v, i) => {
      const x = ((i + 1) / steps) * w;
      const y = h - (v / yMax) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Legend
    const legendX = w - 180;
    const legendY = 20;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(legendX - 8, legendY - 4, 176, 64);

    [
      { color: "#fbbf24", label: "π(x) — actual primes" },
      { color: "rgba(52, 211, 153, 0.8)", label: "Li(x) — best estimate" },
      { color: "rgba(167, 139, 250, 0.6)", label: "x/ln(x) — simple est." },
    ].forEach(({ color, label }, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY + i * 18 + 4, 12, 3);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px 'DM Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, legendX + 18, legendY + i * 18 + 9);
    });
  }, [maxN]);

  return <canvas ref={canvasRef} width={800} height={300} style={{ width: "100%", height: "auto", borderRadius: 8 }} />;
}

function ZeroSpacingHistogram() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    // Compute normalized spacings
    const spacings = [];
    for (let i = 1; i < KNOWN_ZEROS.length; i++) {
      spacings.push(KNOWN_ZEROS[i] - KNOWN_ZEROS[i - 1]);
    }
    const mean = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const normalized = spacings.map(s => s / mean);

    // Histogram
    const bins = 15;
    const binMax = 3;
    const binWidth = binMax / bins;
    const counts = new Array(bins).fill(0);
    normalized.forEach(s => {
      const bin = Math.min(Math.floor(s / binWidth), bins - 1);
      counts[bin]++;
    });

    const maxCount = Math.max(...counts);

    drawGrid(ctx, w, h, 0, binMax, 0, maxCount + 1, "rgba(255,255,255,0.04)");

    // Bars
    counts.forEach((count, i) => {
      const x = (i / bins) * w;
      const barW = w / bins - 2;
      const barH = (count / (maxCount + 1)) * h;
      const y = h - barH;

      const grad = ctx.createLinearGradient(x, y, x, h);
      grad.addColorStop(0, "rgba(251, 191, 36, 0.8)");
      grad.addColorStop(1, "rgba(251, 191, 36, 0.2)");
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y, barW, barH);
    });

    // GUE prediction overlay (Wigner surmise)
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const s = (i / 200) * binMax;
      const x = (s / binMax) * w;
      // Wigner surmise: P(s) = (π/2)s exp(-πs²/4)
      const ps = (Math.PI / 2) * s * Math.exp(-Math.PI * s * s / 4);
      const y = h - (ps * mean * spacings.length * binWidth / (maxCount + 1)) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Legend
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(w - 220, 10, 210, 44);
    ctx.fillStyle = "rgba(251, 191, 36, 0.8)";
    ctx.fillRect(w - 212, 20, 12, 10);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.fillText("Actual zero spacings", w - 194, 29);

    ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w - 212, 42);
    ctx.lineTo(w - 200, 42);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Random matrix prediction", w - 194, 45);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "center";
    ctx.fillText("Normalized spacing (s/mean)", w / 2, h - 6);
  }, []);

  return <canvas ref={canvasRef} width={800} height={250} style={{ width: "100%", height: "auto", borderRadius: 8 }} />;
}

// --- Main App ---
const TABS = [
  { id: "magnitude", label: "Zero Hunter" },
  { id: "critical", label: "Critical Strip" },
  { id: "primes", label: "Prime Connection" },
  { id: "spacing", label: "Random Matrix" },
  { id: "applications", label: "GeoLock Bridge" },
];

export default function RiemannExplorer() {
  const [activeTab, setActiveTab] = useState("magnitude");
  const [tRange, setTRange] = useState([0, 60]);
  const [highlightT, setHighlightT] = useState(null);
  const [maxN, setMaxN] = useState(1000);
  const magnitudeRef = useRef(null);

  const handleMagnitudeHover = useCallback((e) => {
    const rect = e.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const t = tRange[0] + x * (tRange[1] - tRange[0]);
    setHighlightT(t);
  }, [tRange]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #07070d 0%, #0f0f1a 50%, #0a0a12 100%)",
      color: "#e2e8f0",
      fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
      padding: "20px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 20 }}>
        <div style={{
          fontSize: 11,
          letterSpacing: 6,
          color: "rgba(251,191,36,0.5)",
          marginBottom: 8,
          textTransform: "uppercase",
        }}>
          Riemann Zeta Function
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 36,
          fontWeight: 700,
          background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          lineHeight: 1.2,
        }}>
          ζ(s) Explorer
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8, maxWidth: 500, margin: "8px auto 0" }}>
          Interactive exploration of the zeros on the critical line and their connection to prime numbers, cryptography, and signal processing
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        gap: 4,
        justifyContent: "center",
        marginBottom: 24,
        flexWrap: "wrap",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              background: activeTab === tab.id
                ? "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))"
                : "rgba(255,255,255,0.03)",
              border: activeTab === tab.id
                ? "1px solid rgba(251,191,36,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: activeTab === tab.id ? "#fbbf24" : "rgba(255,255,255,0.5)",
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
              transition: "all 0.2s",
              letterSpacing: 0.5,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {activeTab === "magnitude" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                background: "rgba(251,191,36,0.05)",
                border: "1px solid rgba(251,191,36,0.15)",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                fontSize: 13,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.7)",
              }}>
                <strong style={{ color: "#fbbf24" }}>What you're seeing:</strong> The blue curve shows the magnitude of ζ(½+it) as we move up the critical line. Every time it touches zero (marked in gold), that's a non-trivial zero — one of Riemann's "tuning forks" that encodes prime number information. The Riemann Hypothesis says ALL non-trivial zeros live here.
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Range of t:</label>
                {[[0, 60], [0, 30], [10, 50], [30, 80], [60, 105]].map(([a, b]) => (
                  <button
                    key={`${a}-${b}`}
                    onClick={() => setTRange([a, b])}
                    style={{
                      padding: "4px 10px",
                      background: tRange[0] === a && tRange[1] === b
                        ? "rgba(125,211,252,0.15)"
                        : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(125,211,252,0.2)",
                      borderRadius: 4,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      fontFamily: "'DM Mono', monospace",
                      cursor: "pointer",
                    }}
                  >
                    {a}–{b}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={magnitudeRef}
              onMouseMove={handleMagnitudeHover}
              onMouseLeave={() => setHighlightT(null)}
              style={{ cursor: "crosshair" }}
            >
              <ZetaMagnitudePlot tRange={tRange} highlightT={highlightT} />
            </div>

            <div style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, color: "rgba(251,191,36,0.6)", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
                  Zeros in View
                </div>
                <div style={{ fontSize: 22, color: "#fbbf24", fontWeight: 500 }}>
                  {KNOWN_ZEROS.filter(z => z >= tRange[0] && z <= tRange[1]).length}
                </div>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, color: "rgba(125,211,252,0.6)", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
                  Zeros Verified Worldwide
                </div>
                <div style={{ fontSize: 22, color: "#7dd3fc", fontWeight: 500 }}>
                  10,000,000,000,000+
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "critical" && (
          <div>
            <div style={{
              background: "rgba(251,191,36,0.05)",
              border: "1px solid rgba(251,191,36,0.15)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.7)",
            }}>
              <strong style={{ color: "#fbbf24" }}>The Critical Strip:</strong> The shaded region shows where 0 &lt; Re(s) &lt; 1 — this is the "critical strip" where all non-trivial zeros must live. The dashed red line at Re = ½ is the critical line. Every gold dot is a verified zero. Notice how they ALL sit perfectly on the line — that's the Riemann Hypothesis in action.
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ maxWidth: 300 }}>
                <CriticalStripPlot tRange={tRange} />
              </div>
            </div>
            <div style={{
              marginTop: 16,
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 8,
              padding: 14,
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.7,
            }}>
              <strong style={{ color: "rgba(239,68,68,0.8)" }}>The billion-dollar question:</strong> If even a single zero were found off this line — say at Re = 0.4999 — it would disprove the Riemann Hypothesis and send shockwaves through mathematics and cryptography. Every zero we verify on the line is evidence, but not proof.
            </div>
          </div>
        )}

        {activeTab === "primes" && (
          <div>
            <div style={{
              background: "rgba(52,211,153,0.05)",
              border: "1px solid rgba(52,211,153,0.15)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.7)",
            }}>
              <strong style={{ color: "rgb(52,211,153)" }}>Primes ↔ Zeros:</strong> The gold staircase is π(x), the actual count of primes up to x. The green curve (Li(x)) is the prediction that uses information from zeta zeros. The purple dashed line is the naive estimate x/ln(x). If the Riemann Hypothesis is true, Li(x) gives the tightest possible bound on how far off the prime count can be.
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Show primes up to:</label>
              {[200, 500, 1000, 5000, 10000].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxN(n)}
                  style={{
                    padding: "4px 10px",
                    background: maxN === n ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(52,211,153,0.2)",
                    borderRadius: 4,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11,
                    fontFamily: "'DM Mono', monospace",
                    cursor: "pointer",
                  }}
                >
                  {n.toLocaleString()}
                </button>
              ))}
            </div>

            <PrimeDistributionPlot maxN={maxN} />

            <div style={{
              marginTop: 16,
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.7,
            }}>
              Try toggling between small (200) and large (10,000) ranges. Notice how Li(x) hugs the actual prime count much more closely than x/ln(x)? That precision comes from the zeta zeros, and the Riemann Hypothesis guarantees it stays that tight forever.
            </div>
          </div>
        )}

        {activeTab === "spacing" && (
          <div>
            <div style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.7)",
            }}>
              <strong style={{ color: "rgba(239,68,68,0.9)" }}>The Random Matrix Connection:</strong> This is one of the most stunning results in modern math. The gold bars show how far apart consecutive zeta zeros are. The red curve shows the prediction from random matrix theory (GUE ensemble) — the same math used in quantum physics and signal processing. They match astonishingly well. This connection is why zeta zero statistics are relevant to GNSS multipath modeling.
            </div>

            <ZeroSpacingHistogram />

            <div style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 14,
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.6)",
              }}>
                <strong style={{ color: "#fbbf24" }}>Key insight:</strong> The zeros repel each other — they don't cluster or spread randomly. This same "repulsion" pattern appears in energy levels of heavy atomic nuclei, eigenvalues of random matrices, and bus arrival times in Cuernavaca, Mexico.
              </div>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 14,
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.6)",
              }}>
                <strong style={{ color: "#7dd3fc" }}>Signal processing link:</strong> Random matrix theory is used in MIMO antenna design, radar signal processing, and GNSS receiver algorithms — all domains where you're separating signal from noise in correlated channels. The same math governs your multipath entropy.
              </div>
            </div>
          </div>
        )}

        {activeTab === "applications" && (
          <div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.7)",
            }}>
              {[
                {
                  title: "Prime Gap Bounds → Key Size Engineering",
                  color: "#fbbf24",
                  icon: "🔑",
                  text: "GeoLock needs to generate large primes on mobile devices. The Riemann Hypothesis gives the tightest known bound on prime gaps: the gap after prime p is at most O(√p · log p). This directly determines how many candidates your prime generator must test, which impacts battery life and user wait time. Without RH, you'd need larger safety margins — meaning bigger keys and slower generation."
                },
                {
                  title: "Zeta Zero Statistics → Multipath Entropy Models",
                  color: "#ef4444",
                  icon: "📡",
                  text: "Your GeoLock architecture uses GNSS multipath as an entropy source. The statistical distribution of multipath signal arrivals follows patterns described by random matrix theory — the same framework that describes zeta zero spacings. Understanding this connection could help you build a mathematical proof that your entropy source has sufficient min-entropy, which is critical for any security audit of GeoLock."
                },
                {
                  title: "Elliptic Curve Order → Protocol Security",
                  color: "#34d399",
                  icon: "🔐",
                  text: "If GeoLock uses elliptic curve cryptography, the security depends on the curve having a prime (or near-prime) number of points. The Hasse bound tells you roughly how many points to expect, but the Riemann Hypothesis for curves over finite fields (proved by Weil) gives you the exact error term. This is RH already proven and deployed in your cryptographic stack."
                },
                {
                  title: "Primality Testing → Certificate Generation",
                  color: "#7dd3fc",
                  icon: "⚡",
                  text: "The Miller-Rabin primality test, which any crypto system uses to verify large primes, has its deterministic variant's correctness conditional on the Generalized Riemann Hypothesis (GRH). If GRH is true, you can deterministically verify primes in polynomial time with known bounds. This affects how confident you can be in generated keys without relying on probabilistic guarantees."
                },
                {
                  title: "Distribution of Smooth Numbers → Factoring Resistance",
                  color: "#a78bfa",
                  icon: "🛡️",
                  text: "The security of RSA-based systems depends on large numbers being hard to factor. The best factoring algorithms (Number Field Sieve) exploit 'smooth numbers' — numbers with only small prime factors. The density of smooth numbers is governed by prime distribution theorems that sharpen under RH. Understanding this landscape helps you choose parameters that resist factoring attacks."
                },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${item.color}22`,
                  borderLeft: `3px solid ${item.color}66`,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: item.color,
                    marginBottom: 8,
                  }}>
                    {item.icon} {item.title}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        marginTop: 40,
        paddingBottom: 20,
        fontSize: 10,
        color: "rgba(255,255,255,0.2)",
        letterSpacing: 1,
      }}>
        RIEMANN ZETA EXPLORER · BUILT FOR GEOLOCK RESEARCH · {KNOWN_ZEROS.length} ZEROS LOADED
      </div>
    </div>
  );
}
