"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const GRID_W = 12;
const GRID_H = 6;
const DEFAULT_OBSTACLES = new Set([
  "2,1", "2,2", "2,3", "2,4",
  "5,0", "5,1", "5,2",
  "7,3", "7,4", "7,5",
  "9,1", "10,1", "10,2",
]);

type Point = { x: number; y: number };

function key(p: Point) {
  return `${p.x},${p.y}`;
}

function heuristic(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start: Point, goal: Point, blocked: Set<string>) {
  const open = [start];
  const cameFrom = new Map<string, string>();
  const g = new Map<string, number>([[key(start), 0]]);
  const f = new Map<string, number>([[key(start), heuristic(start, goal)]]);
  const visited = new Set<string>();

  const neighbors = (p: Point) => {
    const list = [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ];
    return list.filter(
      (n) =>
        n.x >= 0 &&
        n.x < GRID_W &&
        n.y >= 0 &&
        n.y < GRID_H &&
        !blocked.has(key(n)),
    );
  };

  while (open.length) {
    open.sort((a, b) => (f.get(key(a)) ?? Infinity) - (f.get(key(b)) ?? Infinity));
    const current = open.shift()!;
    const currentKey = key(current);
    visited.add(currentKey);

    if (currentKey === key(goal)) {
      const path: Point[] = [current];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor)!;
        const [x, y] = cursor.split(",").map(Number);
        path.unshift({ x, y });
      }
      return { path, visited: [...visited] };
    }

    for (const next of neighbors(current)) {
      const nextKey = key(next);
      const tentative = (g.get(currentKey) ?? Infinity) + 1;
      if (tentative < (g.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, currentKey);
        g.set(nextKey, tentative);
        f.set(nextKey, tentative + heuristic(next, goal));
        if (!open.some((p) => key(p) === nextKey)) open.push(next);
      }
    }
  }

  return { path: [], visited: [...visited] };
}

export default function Home() {
  const character = useRef<HTMLDivElement>(null);
  const characterMouse = useRef<HTMLDivElement>(null);
  const characterIdle = useRef<HTMLDivElement>(null);
  const heroContent = useRef<HTMLDivElement>(null);
  const typedName = useRef<HTMLSpanElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [obstacles, setObstacles] = useState<Set<string>>(new Set(DEFAULT_OBSTACLES));
  const [path, setPath] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (character.current) {
        gsap.to(character.current, {
          y: -180,
          x: 70,
          rotation: -4,
          scale: 1.04,
          ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
        });
      }

      if (heroContent.current) {
        gsap.to(heroContent.current, {
          y: -140,
          opacity: 0.15,
          ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
        });
      }

      // TYPING ANIMATION
      if (
        typedName.current &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const text = "ARYA";
        const typeSpeed = 0.14;
        const deleteSpeed = 0.09;

        const typing = gsap.timeline({
          repeat: -1,
          repeatDelay: 1.2,
        });

        typing
          .set(typedName.current, { textContent: "" })
          .to({}, {
            duration: 0.25,
            onComplete: () => {
              if (typedName.current) typedName.current.textContent = "";
            },
          });

        for (let i = 1; i <= text.length; i++) {
          typing.to({}, {
            duration: typeSpeed,
            onComplete: () => {
              if (typedName.current) {
                typedName.current.textContent = text.slice(0, i);
              }
            },
          });
        }

        typing.to({}, { duration: 1.4 });

        for (let i = text.length - 1; i >= 0; i--) {
          typing.to({}, {
            duration: deleteSpeed,
            onComplete: () => {
              if (typedName.current) {
                typedName.current.textContent = text.slice(0, i);
              }
            },
          });
        }
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!characterMouse.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 25;
        const y = (e.clientY / window.innerHeight - 0.5) * 15;
        gsap.to(characterMouse.current, { x, y, duration: 1.2, ease: "power3.out", overwrite: "auto" });
      };

      const handleCursor = (e: MouseEvent) => {
        if (!cursor.current || window.matchMedia("(pointer: coarse)").matches) return;
        gsap.to(cursor.current, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mousemove", handleCursor);

      if (characterIdle.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.to(characterIdle.current, {
          y: -8,
          rotation: 0.5,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        gsap.from(element, {
          y: 50,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 82%", once: true },
        });
      });

      gsap.from(".project-card", {
        y: 70,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ".project-grid", start: "top 78%", once: true },
      });

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mousemove", handleCursor);
      };
    });

    return () => ctx.revert();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const toggleObstacle = (x: number, y: number) => {
    if (running || (x === 0 && y === 5) || (x === 11 && y === 0)) return;
    const next = new Set(obstacles);
    const cell = `${x},${y}`;
    next.has(cell) ? next.delete(cell) : next.add(cell);
    setObstacles(next);
    setPath(new Set());
    setVisited(new Set());
  };

  const runPathfinding = () => {
    if (running) return;
    setRunning(true);
    setPath(new Set());
    setVisited(new Set());
    const result = findPath({ x: 0, y: 5 }, { x: 11, y: 0 }, obstacles);
    const visitedKeys = result.visited;
    const pathKeys = result.path.map(key);

    visitedKeys.forEach((cell, index) => {
      window.setTimeout(() => setVisited((prev) => new Set(prev).add(cell)), index * 25);
    });

    window.setTimeout(() => {
      pathKeys.forEach((cell, index) => {
        window.setTimeout(() => setPath((prev) => new Set(prev).add(cell)), index * 55);
      });
      window.setTimeout(() => setRunning(false), pathKeys.length * 55 + 100);
    }, visitedKeys.length * 25 + 100);
  };

  const resetPathfinding = () => {
    if (running) return;
    setObstacles(new Set(DEFAULT_OBSTACLES));
    setPath(new Set());
    setVisited(new Set());
  };

  return (
    <main>
      <nav className="navbar" aria-label="Main navigation">
        <a className="logo" href="#home" onClick={closeMenu}>JUNE<span>.</span></a>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#home" onClick={closeMenu}>HOME</a>
          <a href="#about" onClick={closeMenu}>ABOUT</a>
          <a href="#projects" onClick={closeMenu}>PROJECTS</a>
          <a href="#contact" onClick={closeMenu}>CONTACT</a>
        </div>
        <button className="menu-button" aria-label="Toggle navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
          <span />
          <span />
          <span />
        </button>
      </nav>

      <section id="home" className="hero">
        <div className="hero-glow" />
        <div className="particles" aria-hidden="true">
          {Array.from({ length: 35 }).map((_, i) => <span key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%`, animationDelay: `${(i % 9) * -0.8}s` }} />)}
        </div>

        <div ref={heroContent} className="hero-content">
          <p className="hero-label">HELLO, I&apos;M</p>
          <h1>ARJUNA<br /><span ref={typedName}></span><span className="typing-cursor" aria-hidden="true">_</span></h1>
          <p className="hero-description">I build interactive experiences, games, and beautiful websites with code and creativity.</p>
          <div className="hero-actions">
            <a href="#projects" className="hero-button">EXPLORE MY WORK <span>→</span></a>
            <a href="#contact" className="text-link">LET&apos;S TALK ↗</a>
          </div>
        </div>

        <div ref={character} className="character-wrapper" aria-hidden="true">
          <div ref={characterMouse} className="character-mouse">
            <div ref={characterIdle} className="character-idle">
              <div className="character-glow" />
              <Image src="/1.png" alt="" width={720} height={960} className="character-image" priority />
            </div>
          </div>
        </div>

        <div className="social" aria-label="Social links">
          <a href="#contact">GITHUB</a>
          <a href="#contact">TWITTER</a>
          <a href="#contact">LINKEDIN</a>
          <a href="mailto:your@email.com">MAIL</a>
        </div>

        <a className="scroll-indicator" href="#about" aria-label="Scroll to about section">
          <span>SCROLL</span><div />
        </a>
      </section>

      <section id="about" className="about reveal">
        <div className="section-number">01</div>
        <div className="about-inner">
          <div className="about-heading">
            <p>ABOUT ME</p>
            <h2>GAME DEV.<br />WEB DEV.<br /><span>INTERACTIVE REALITY.</span></h2>
          </div>
          <div className="about-description">
            <p>I&apos;m a developer focused on interactive experiences, 2D games, and modern web interfaces. I enjoy turning ideas into polished products through code, animation, and thoughtful UI.</p>
            <p className="about-note">Currently exploring game systems, NPC AI, A* pathfinding, and creative frontend experiences.</p>
          </div>
        </div>
      </section>

      <section className="skills reveal" aria-label="Skills">
        <div className="skill"><div className="skill-icon">&lt;/&gt;</div><h3>GAME DEVELOPMENT</h3><p>Unity · C#<br />2D Games · NPC AI<br />A* Pathfinding</p></div>
        <div className="skill"><div className="skill-icon">◇</div><h3>WEB DEVELOPMENT</h3><p>Next.js · React<br />TypeScript · CSS<br />GSAP · Responsive UI</p></div>
        <div className="skill"><div className="skill-icon">✦</div><h3>DESIGN</h3><p>UI / UX<br />Figma · Prototyping<br />Motion &amp; Interaction</p></div>
      </section>

      <section id="projects" className="projects">
        <div className="section-number">02</div>
        <div className="projects-header reveal">
          <div><p>SELECTED WORK</p><h2>PROJECTS</h2></div>
          <span>BUILT WITH CODE + CREATIVITY</span>
        </div>

        <div className="project-grid">
          <article className="project-card">
            <div className="project-image vineland"><span>01</span><strong>↗</strong><div className="project-image-label">GAME</div></div>
            <div className="project-content"><h3>VINELAND</h3><p>2D ADVENTURE GAME</p><div className="tags"><span>UNITY</span><span>C#</span><span>A* PATHFINDING</span></div><p className="project-detail">Adventure game prototype featuring NPC navigation and shortest-path systems.</p></div>
          </article>

          <article className="project-card featured-card">
            <div className="project-image pathfinding"><span>02</span><strong>↗</strong><div className="project-image-label">INTERACTIVE</div></div>
            <div className="project-content"><h3>A* PATHFINDING</h3><p>NPC NAVIGATION SYSTEM</p><div className="tags"><span>UNITY</span><span>C#</span><span>ALGORITHM</span></div><p className="project-detail">Interactive visualization of how an NPC finds the shortest route around obstacles.</p></div>
          </article>

          <article className="project-card">
            <div className="project-image comic"><span>03</span><strong>↗</strong><div className="project-image-label">UI / UX</div></div>
            <div className="project-content"><h3>COMIC UI</h3><p>INTERACTIVE INTERFACE</p><div className="tags"><span>FIGMA</span><span>UI / UX</span><span>PROTOTYPE</span></div><p className="project-detail">A reading experience focused on clean navigation and immersive comic presentation.</p></div>
          </article>
        </div>

        <div className="pathfinding-demo reveal">
          <div className="demo-copy"><p className="eyebrow">LIVE EXPERIMENT</p><h3>SEE A* <span>IN ACTION.</span></h3><p>Click empty cells to add obstacles, then run the algorithm. The blue nodes show explored cells and the red line shows the final path.</p><div className="demo-actions"><button onClick={runPathfinding} disabled={running}>{running ? "RUNNING..." : "RUN A* →"}</button><button className="secondary-button" onClick={resetPathfinding} disabled={running}>RESET</button></div></div>
          <div className="astar-board" role="grid" aria-label="Interactive A star pathfinding demo">
            {Array.from({ length: GRID_H }).flatMap((_, y) => Array.from({ length: GRID_W }).map((__, x) => {
              const cell = `${x},${y}`;
              const isStart = x === 0 && y === 5;
              const isGoal = x === 11 && y === 0;
              const classes = ["astar-cell", obstacles.has(cell) ? "blocked" : "", visited.has(cell) ? "visited" : "", path.has(cell) ? "path" : "", isStart ? "start" : "", isGoal ? "goal" : ""].filter(Boolean).join(" ");
              return <button key={cell} className={classes} onClick={() => toggleObstacle(x, y)} aria-label={`${isStart ? "Start" : isGoal ? "Goal" : `Grid ${x + 1}, ${y + 1}`}`} />;
            }))}
          </div>
        </div>
      </section>

      <section id="contact" className="contact reveal">
        <div className="section-number">03</div>
        <div className="contact-inner">
          <p>LET&apos;S WORK TOGETHER</p>
          <h2>HAVE A PROJECT<br /><span>IN MIND?</span></h2>
          <p className="contact-description">I&apos;m open to opportunities, collaborations, game projects, and creative web experiences.</p>
          <a href="mailto:your@email.com" className="contact-button">GET IN TOUCH <span>→</span></a>
        </div>
      </section>

      <footer>
        <strong>JUNE<span>.</span></strong>
        <span>© 2026 ALL RIGHTS RESERVED.</span>
        <span>BUILT WITH PASSION ♥</span>
      </footer>

      <div ref={cursor} className="custom-cursor" aria-hidden="true"><span /></div>
    </main>
  );
}