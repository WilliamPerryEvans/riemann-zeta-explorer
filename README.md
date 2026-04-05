# ζ(s) Explorer — Riemann Zeta Function

An interactive visualization of the Riemann Zeta Function, built to explore the deepest unsolved problem in mathematics and its practical connections to cryptography, signal processing, and location-based encryption.

See it live here:https://williamperryevans.github.io/riemann-zeta-explorer/

## What Is This?

The **Riemann Hypothesis** (1859) states that all non-trivial zeros of the zeta function sit on a single line in the complex plane — the "critical line" where the real part equals ½. Over 10 trillion zeros have been verified computationally, and every single one is on the line. Nobody has proven *why*.

This explorer lets you see the zeros, watch how they encode prime number distribution, and understand why this 167-year-old conjecture matters for modern cryptography.

## Modules

### Module 1: Zero Hunter

A line chart of |ζ(½+it)| — the magnitude of the zeta function evaluated along the critical line. Every time the curve touches zero, that's a **non-trivial zero** — one of Riemann's "tuning forks" that encodes information about prime numbers.

- **Hover** to inspect the function's value at any point
- **Toggle ranges** to explore different stretches of the critical line (t = 0–105)
- Gold markers flag the 30 preloaded known zeros

### Module 2: Critical Strip

A vertical cross-section of the complex plane. The shaded band (0 < Re < 1) is the **critical strip** — the only region where non-trivial zeros can exist. The dashed red line at Re = ½ is the critical line. Gold dots are verified zeros.

This is the "map view" — instead of watching the function's value, you see *where* the zeros sit in the complex plane. The Riemann Hypothesis claims they all line up on that red line.

### Module 3: Prime Connection

Three curves overlaid to show the zeta function's practical purpose:

| Curve | What It Shows |
|-------|--------------|
| **Gold staircase** — π(x) | The actual count of prime numbers up to x |
| **Green curve** — Li(x) | The logarithmic integral estimate, informed by zeta zeros |
| **Purple dashed** — x/ln(x) | The naive estimate from the Prime Number Theorem |

Toggle the upper limit from 200 to 10,000 to watch Li(x) stay tight against the actual prime count while x/ln(x) drifts. That precision comes from the zeros — and the Riemann Hypothesis guarantees it holds forever.

### Module 4: Random Matrix

A histogram of **normalized spacings** between consecutive zeta zeros, overlaid with the **Wigner surmise** from random matrix theory (GUE ensemble).

The match is one of the deepest unexplained connections in mathematics. The same statistical framework governs:
- Energy levels of heavy atomic nuclei
- Eigenvalues of random Hermitian matrices
- GNSS multipath signal arrival patterns
- Correlated noise in MIMO antenna arrays

### Module 5: GeoLock Bridge

Five application cards mapping Riemann Hypothesis concepts to engineering decisions in cryptography and location-based encryption:

1. **Prime Gap Bounds → Key Size Engineering** — RH gives the tightest guarantee on consecutive prime gaps, directly affecting prime generation efficiency on mobile devices
2. **Zeta Zero Statistics → Multipath Entropy Models** — Random matrix theory connects zero spacings to GNSS signal processing, informing min-entropy proofs for location-based entropy sources
3. **Elliptic Curve Order → Protocol Security** — The Riemann Hypothesis for curves over finite fields (proved by Weil) provides exact error terms for point counting on elliptic curves used in ECC
4. **Primality Testing → Certificate Generation** — The deterministic Miller-Rabin test's correctness depends on the Generalized Riemann Hypothesis (GRH)
5. **Smooth Number Density → Factoring Resistance** — Prime distribution theorems sharpened under RH govern the density of smooth numbers exploited by the Number Field Sieve

## Tech Stack

- **React 18** — UI components and state management
- **HTML5 Canvas** — All visualizations rendered directly, no chart library dependencies
- **Vite** — Build tooling and dev server
- **Client-side math** — All zeta function computation, prime sieving, and numerical integration runs in the browser

## Math Utilities

| Function | Description |
|----------|-------------|
| `zetaCriticalLine(t)` | Computes ζ(½+it) via 200-term partial sum approximation |
| `zetaMagnitude(t)` | Returns \|ζ(½+it)\| — magnitude on the critical line |
| `sieveOfEratosthenes(n)` | Classic prime sieve returning all primes ≤ n |
| `primeCountingFunction(x)` | Counts primes ≤ x (the π(x) staircase) |
| `li(x)` | Logarithmic integral via Simpson's rule, 200 fixed intervals |

## Performance Notes

- The `li(x)` function uses **Simpson's rule with a fixed 200-interval count** rather than a fixed step size. This prevents O(n) blowup at large x values — computing Li(10,000) takes the same time as Li(200).
- The zeta approximation uses a 200-term partial sum, which is accurate for t < ~100. Above that, precision degrades. A future enhancement would implement the Riemann-Siegel formula for better high-t accuracy.
- 30 zeros are preloaded from published tables. Dynamic zero computation is a planned roadmap item.

## Known Limitations

- Zeta approximation loses accuracy above t ≈ 100 (200-term partial sum limitation)
- Only 30 preloaded zeros — not computed dynamically
- All computation is single-threaded in the browser main thread
- No mobile-optimized touch interactions yet

## Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/riemann-zeta-explorer.git
cd riemann-zeta-explorer

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server will start at `http://localhost:5173`. The production build outputs to `dist/` and can be deployed to GitHub Pages, Vercel, Netlify, or any static host.

### Deploy to GitHub Pages

```bash
# Build the project
npm run build

# The dist/ folder is your deploy target
# Option A: Use gh-pages package
npm install -D gh-pages
npx gh-pages -d dist

# Option B: Push dist/ to a gh-pages branch manually
```

In your GitHub repo settings, set Pages source to the `gh-pages` branch.

## Roadmap

- [ ] **Dynamic zero computation** — Implement Riemann-Siegel formula for accurate high-t zero finding
- [ ] **Explicit formula reconstruction** — Visualize how summing zeta zeros reconstructs the prime counting function
- [ ] **Monte Carlo spacing experiments** — Statistical tests of zero spacing against GUE predictions with confidence intervals
- [ ] **Elliptic curve module** — Interactive exploration of rational points on curves, connecting to BSD Conjecture and ECC
- [ ] **Web Worker computation** — Move heavy math off the main thread for smoother interaction
- [ ] **Lean 4 formalization** — Formal verification of partial results in the Lean proof assistant
- [ ] **Python/Rust backend** — GPU-accelerated zero computation for research-scale exploration

## Background Reading

- [Riemann's 1859 Paper](https://www.claymath.org/sites/default/files/ezeta.pdf) — The original 8-page paper that started it all
- [The Music of the Primes](https://www.amazon.com/Music-Primes-Searching-Greatest-Mathematics/dp/0062064010) — Marcus du Sautoy's accessible book on RH
- [Random Matrices and the Riemann Zeta Function](https://arxiv.org/abs/math-ph/0310005) — The GUE connection
- [Clay Mathematics Institute — Riemann Hypothesis](https://www.claymath.org/millennium-problems/riemann-hypothesis) — Official Millennium Prize problem statement

## License

MIT

## Author

Built with Claude (Anthropic) as a research and learning tool for exploring the intersection of number theory, cryptography, and applied mathematics.
