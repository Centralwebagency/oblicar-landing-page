/* ============================================================
   OBLICAR — main.js
   
   Modules :
   01. Canvas — Réseau lumineux animé (fond)
   02. Navbar — Glassmorphism au scroll
   ============================================================ */


/* ============================================================
   01. CANVAS — Réseau lumineux style topologie abstraite
   
   Rendu :
   - Grille de nœuds légèrement aléatoires ("villes")
   - Lignes ultra-fines (0.4px) entre voisins proches
   - Signaux lumineux qui voyagent sur les routes avec dégradé
   - Halos pulsés sur chaque nœud
   Tout en bleu Oblicar (#0d6efd), faible opacité.
   ============================================================ */

(function initCanvas() {

    const canvas = document.getElementById('canvas-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    /* ── Palette (RGB Oblicar primary) ── */
    const RGB = '13, 110, 253';

    /* ── Configuration ── */
    const CONFIG = {
        cols:       9,      /* colonnes de la grille de nœuds */
        rows:       7,      /* lignes */
        jitter:     0.40,   /* dispersion aléatoire (0 = grille parfaite) */
        connDist:   1.85,   /* distance max en "cellules" pour créer une route */
        lineAlpha:  0.09,   /* opacité des lignes statiques */
        nodeAlpha:  0.28,   /* opacité des nœuds */
        signalLen:  0.18,   /* longueur du segment lumineux (0–1) */
        signalProb: 0.55,   /* probabilité qu'une route ait un signal actif */
    };

    let W, H;
    let nodes   = [];
    let edges   = [];
    let signals = [];
    let raf;

    /* ── Construction du réseau ── */
    function buildNetwork() {
        const cellW = W / CONFIG.cols;
        const cellH = H / CONFIG.rows;

        /* Nœuds : une position par cellule avec jitter */
        nodes = [];
        for (let r = 0; r <= CONFIG.rows; r++) {
            for (let c = 0; c <= CONFIG.cols; c++) {
                nodes.push({
                    x:     (c + (Math.random() - 0.5) * CONFIG.jitter) * cellW,
                    y:     (r + (Math.random() - 0.5) * CONFIG.jitter) * cellH,
                    r:     Math.random() * 1.5 + 1.2,
                    pulse: Math.random() * Math.PI * 2,
                });
            }
        }

        /* Routes : connecter les nœuds sous le seuil de distance */
        const maxDist = CONFIG.connDist * Math.min(cellW, cellH);
        edges = [];
        const seen = new Set();

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const key = i + '_' + j;
                if (seen.has(key)) continue;

                const d = Math.hypot(
                    nodes[i].x - nodes[j].x,
                    nodes[i].y - nodes[j].y
                );

                if (d < maxDist) {
                    seen.add(key);
                    edges.push({ a: nodes[i], b: nodes[j] });
                }
            }
        }

        /* Signaux : un sous-ensemble de routes animées */
        signals = edges
            .filter(() => Math.random() < CONFIG.signalProb)
            .map(function(edge) {
                return {
                    edge:  edge,
                    t:     Math.random(),
                    speed: Math.random() * 0.0012 + 0.0006,
                    dir:   Math.random() > 0.5 ? 1 : -1,
                };
            });
    }

    /* ── Resize ── */
    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        buildNetwork();
    }

    /* ── Boucle de rendu ── */
    function tick() {
        ctx.clearRect(0, 0, W, H);

        const now = performance.now() / 1000; /* temps en secondes */

        /* 1 — Lignes statiques ultra-fines */
        edges.forEach(function(e) {
            ctx.beginPath();
            ctx.moveTo(e.a.x, e.a.y);
            ctx.lineTo(e.b.x, e.b.y);
            ctx.strokeStyle = 'rgba(' + RGB + ',' + CONFIG.lineAlpha + ')';
            ctx.lineWidth   = 0.4;
            ctx.stroke();
        });

        /* 2 — Nœuds avec halo pulsé */
        nodes.forEach(function(n) {
            const p     = 0.5 + 0.5 * Math.sin(now * 0.9 + n.pulse);
            const haloR = n.r + 4 + p * 3;

            /* Halo radial */
            const g = ctx.createRadialGradient(n.x, n.y, n.r * 0.5, n.x, n.y, haloR);
            g.addColorStop(0, 'rgba(' + RGB + ',' + CONFIG.nodeAlpha * 0.45 * p + ')');
            g.addColorStop(1, 'rgba(' + RGB + ',0)');

            ctx.beginPath();
            ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();

            /* Point central */
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + RGB + ',' + CONFIG.nodeAlpha + ')';
            ctx.fill();
        });

        /* 3 — Signaux lumineux en mouvement */
        signals.forEach(function(s) {

            /* Déplacement */
            s.t += s.speed * s.dir;
            if (s.t >= 1) { s.t = 1; s.dir = -1; }
            if (s.t <= 0) { s.t = 0; s.dir =  1; }

            /* Calcul du segment : tête + queue */
            const len = CONFIG.signalLen;
            const tA  = Math.max(0, s.t - (s.dir > 0 ? len : 0));
            const tB  = Math.min(1, s.t + (s.dir < 0 ? len : 0));
            const tMin = Math.min(tA, tB);
            const tMax = Math.max(tA, tB);

            const ax = s.edge.a.x, ay = s.edge.a.y;
            const bx = s.edge.b.x, by = s.edge.b.y;

            const x0 = ax + (bx - ax) * tMin;
            const y0 = ay + (by - ay) * tMin;
            const x1 = ax + (bx - ax) * s.t;   /* tête du signal */
            const y1 = ay + (by - ay) * s.t;
            const x2 = ax + (bx - ax) * tMax;
            const y2 = ay + (by - ay) * tMax;

            /* Dégradé le long du segment : fade-in → plein → fade-out */
            const gSig = ctx.createLinearGradient(x0, y0, x2, y2);
            gSig.addColorStop(0,    'rgba(' + RGB + ',0)');
            gSig.addColorStop(0.35, 'rgba(' + RGB + ',0.55)');
            gSig.addColorStop(0.65, 'rgba(' + RGB + ',0.55)');
            gSig.addColorStop(1,    'rgba(' + RGB + ',0)');

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = gSig;
            ctx.lineWidth   = 1.2;
            ctx.stroke();

            /* Point brillant en tête */
            ctx.beginPath();
            ctx.arc(x1, y1, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + RGB + ',0.80)';
            ctx.fill();
        });

        raf = requestAnimationFrame(tick);
    }

    /* ── Init & resize ── */
    resize();
    tick();

    window.addEventListener('resize', function() {
        cancelAnimationFrame(raf);
        resize();
        tick();
    }, { passive: true });

})();


/* ============================================================
   02. NAVBAR — Glassmorphism au scroll
   Ajoute/retire la classe `.scrolled` selon la position Y.
   Le style est géré entièrement dans styles.css (.nav.scrolled).
   ============================================================ */

(function initNav() {

    const nav = document.getElementById('nav');
    if (!nav) return;

    function update() {
        nav.classList.toggle('scrolled', window.scrollY > 20);
    }

    window.addEventListener('scroll', update, { passive: true });
    update(); /* Vérification immédiate au chargement */

})();


/* ============================================================
   REVEAL — Animation d'apparition au scroll
   Observe tous les éléments .reveal et ajoute .is-visible
   quand ils entrent dans le viewport.
   ============================================================ */

(function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            // Délai progressif selon l'ordre dans le DOM
            const index = Array.from(elements).indexOf(entry.target);
            const delay = (index % 3) * 120;
            setTimeout(function() {
                entry.target.classList.add('is-visible');
            }, delay);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.15 });

    elements.forEach(function(el) { observer.observe(el); });
})();


/* ============================================================
   VIDÉOS — Lecteur custom play/pause
   ============================================================ */


        // ── Play / Pause ──
        player.addEventListener('click', function(e) {
            // Ne pas déclencher play si clic sur le bouton fullscreen

                    if (v !== video) {
                        v.pause();
                         .classList.remove('is-playing');
                    }
                });
            } else {
            }
        });

        });

        // ── Fullscreen ──
                e.stopPropagation();

                if (video.requestFullscreen) {
                    video.requestFullscreen();
                } else if (video.webkitRequestFullscreen) {
                    video.webkitRequestFullscreen();
                } else if (video.mozRequestFullScreen) {
                    video.mozRequestFullScreen();
                } else if (video.msRequestFullscreen) {
                    video.msRequestFullscreen();
                }

                // Lancer la vidéo si elle était en pause
                }
            });
        }
    });
})();


/* ============================================================
   FOOTER — Année dynamique
   ============================================================ */

(function initFooter() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
})();
