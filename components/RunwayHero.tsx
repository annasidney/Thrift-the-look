"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import SaveButton from "@/components/SaveButton";
import { playfair } from "@/lib/fonts";

export type CutoutBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type RunwayPiece = {
  id: string;
  outfit_id: string;
  category: string;
  image_url: string;
  pin_x: number | null;
  pin_y: number | null;
  pin_left?: number;
  pin_top?: number;
  pin_number?: number;
};

export type RunwayShopRow = {
  piece_id: string;
  piece_category: string;
  tier: "thrift" | "mid" | "premium" | string;
  product_name: string;
  price_inr: number;
  store: string;
  link: string;
  product_image_url: string;
  similarity: number;
};

export type RunwayOutfit = {
  id: string;
  title: string;
  cutout_url: string;
  cutout_box: CutoutBox;
  pieces: RunwayPiece[];
  shopRows: RunwayShopRow[];
};

type TierType = "thrift" | "mid" | "premium";

const CATEGORY_LABELS: Record<string, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bag: "Bag",
};

const K_SPRING = 95;
const DAMPING = 2 * Math.sqrt(K_SPRING); // 19.493588 (critically damped)
const AUTOPLAY_DURATION = 5000; // 5 seconds

function formatINR(val: number) {
  return "₹" + Number(val).toLocaleString("en-IN");
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function RunwayHero({ outfits }: { outfits: RunwayOutfit[] }) {
  const N = outfits?.length ?? 0;

  const isReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Active outfit target index (0 to N-1)
  const [targetIdx, setTargetIdx] = useState(0);
  const [springPos, setSpringPos] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [highlightedPieceId, setHighlightedPieceId] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, TierType>>({});
  const [sweepKey, setSweepKey] = useState(0);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragDeltaXRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Go to specific outfit index
  const goTo = useCallback(
    (index: number) => {
      const next = ((index % N) + N) % N;
      setTargetIdx(next);
      setProgress(0);
      setSweepKey((k) => k + 1);
      setHighlightedPieceId(null);
    },
    [N]
  );

  const prev = useCallback(() => goTo(targetIdx - 1), [goTo, targetIdx]);
  const next = useCallback(() => goTo(targetIdx + 1), [goTo, targetIdx]);

  // Spring physics loop (only runs when motion is not reduced)
  useEffect(() => {
    if (N < 3 || isReducedMotion) return;

    let running = true;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!running) return;
      const deltaMs = lastTimeRef.current ? now - lastTimeRef.current : 16;
      lastTimeRef.current = now;

      if (!isDraggingRef.current) {
        setSpringPos((curPos) => {
          let diff = targetIdx - curPos;
          while (diff > N / 2) diff -= N;
          while (diff < -N / 2) diff += N;

          if (Math.abs(diff) < 0.0005 && Math.abs(velocity) < 0.0005) {
            setVelocity(0);
            return targetIdx;
          }

          const dt = Math.min(Math.max(deltaMs / 1000, 0.001), 0.05);
          const accel = K_SPRING * diff - DAMPING * velocity;
          const nextVel = velocity + accel * dt;
          setVelocity(nextVel);
          return curPos + nextVel * dt;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetIdx, velocity, N, isReducedMotion]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || isDraggingRef.current || N < 3) return;

    const interval = 50;
    const step = (interval / AUTOPLAY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, next, N]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev, next]);

  // Pointer drag / swipe handling
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragDeltaXRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    dragDeltaXRef.current = deltaX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    const deltaX = dragDeltaXRef.current;
    if (deltaX < -40) {
      next();
    } else if (deltaX > 40) {
      prev();
    }
  };

  // Trackpad horizontal scroll support
  const wheelAccumRef = useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      wheelAccumRef.current += e.deltaX;
      if (wheelAccumRef.current > 50) {
        wheelAccumRef.current = 0;
        next();
      } else if (wheelAccumRef.current < -50) {
        wheelAccumRef.current = 0;
        prev();
      }
    }
  };

  // Current display position (either discrete target if reduced motion, or animated spring)
  const currentPos = isReducedMotion ? targetIdx : springPos;

  // Active outfit & calculations
  const activeOutfit = outfits[targetIdx] ?? outfits[0];

  const pieceRows = useMemo(() => {
    if (!activeOutfit) return [];
    return activeOutfit.pieces.map((piece) => {
      const selectedTier = selectedTiers[piece.id] ?? "mid";
      const relatedRows = activeOutfit.shopRows.filter(
        (r) =>
          r.piece_id === piece.id ||
          r.piece_category.toLowerCase() === piece.category.toLowerCase()
      );

      const thriftRow = relatedRows.find((r) => r.tier.toLowerCase() === "thrift");
      const midRow = relatedRows.find((r) => r.tier.toLowerCase() === "mid");
      const premiumRow = relatedRows.find((r) => r.tier.toLowerCase() === "premium");

      const activeProduct =
        (selectedTier === "thrift" ? thriftRow : selectedTier === "premium" ? premiumRow : midRow) ??
        relatedRows[0] ??
        null;

      return {
        piece,
        selectedTier,
        thriftRow,
        midRow,
        premiumRow,
        activeProduct,
      };
    });
  }, [activeOutfit, selectedTiers]);

  const { selectedTotal, allThriftTotal, allPremiumTotal } = useMemo(() => {
    let sel = 0;
    let thr = 0;
    let prem = 0;

    for (const row of pieceRows) {
      const pPrice = row.activeProduct?.price_inr ?? 0;
      sel += pPrice;

      const tPrice = row.thriftRow?.price_inr ?? pPrice;
      thr += tPrice;

      const prPrice = row.premiumRow?.price_inr ?? pPrice;
      prem += prPrice;
    }

    return {
      selectedTotal: sel,
      allThriftTotal: thr,
      allPremiumTotal: prem,
    };
  }, [pieceRows]);

  if (!outfits || outfits.length < 3) {
    return null;
  }

  return (
    <section
      aria-label="Runway Collection"
      className="animate-runway-intro relative mb-12 w-full select-none overflow-hidden rounded-3xl border border-[#c8c8c8]/70 bg-white"
    >
      <style jsx>{`
        @keyframes runwayIntro {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes runwaySweep {
          0% {
            transform: translateX(-100%) skewX(-15deg);
            opacity: 0;
          }
          40% {
            opacity: 0.55;
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
            opacity: 0;
          }
        }
        .animate-runway-intro {
          animation: runwayIntro 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-sweep {
          animation: runwaySweep 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* Main Grid: Desktop side-by-side (>=1100px), Tablet stacked, Mobile simplified */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] lg:h-[calc(100svh-65px)] lg:min-h-[580px] lg:max-h-[800px]">
        {/* ================= LEFT / STAGE ================= */}
        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#fafaf9] via-white to-[#f5f5f4] cursor-grab active:cursor-grabbing h-[460px] sm:h-[540px] lg:h-full"
        >
          {/* Light Sweep Effect on Look Change */}
          <div
            key={sweepKey}
            className="pointer-events-none absolute inset-0 z-20 animate-sweep bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />

          {/* Top subtle badge */}
          <div className="absolute left-6 top-6 z-25 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#66625c]">
              Runway • 3 Budgets
            </span>
          </div>

          {/* Floor Line */}
          <div className="pointer-events-none absolute bottom-[18%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c8c8c8] to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[18%] bg-gradient-to-t from-neutral-200/30 to-transparent" />

          {/* 3D Ring Stage Models */}
          <div className="relative flex-1 w-full overflow-hidden">
            {outfits.map((outfit, i) => {
              // Angular distance from current position
              let delta = i - currentPos;
              while (delta > N / 2) delta -= N;
              while (delta < -N / 2) delta += N;

              const angle = delta * ((2 * Math.PI) / N);
              const cosA = Math.cos(angle);
              const sinA = Math.sin(angle);

              // 3D projections
              const isFront = Math.abs(delta) < 0.45;
              const xPx = sinA * 260; // horizontal separation
              const baseScale = isFront ? 1.08 : 0.65 + 0.35 * Math.max(0, cosA);
              const scale = Math.max(0.4, baseScale);
              const depthBlur = isFront ? 0 : Math.min(8, (1 - cosA) * 6);
              const opacity = Math.max(0.18, (cosA + 0.2) / 1.2);
              const zIndex = Math.round(50 + cosA * 40);

              // Skip rendering items completely behind or clipped
              if (cosA < -0.4) return null;

              return (
                <div
                  key={outfit.id}
                  onClick={() => {
                    if (!isFront) goTo(i);
                  }}
                  style={{
                    transform: `translate3d(calc(-50% + ${xPx}px), 0, 0) scale(${scale})`,
                    transformOrigin: "bottom center",
                    filter: depthBlur > 0.2 ? `blur(${depthBlur.toFixed(1)}px)` : undefined,
                    opacity: opacity,
                    zIndex: zIndex,
                    bottom: "18%",
                  }}
                  className={`absolute left-1/2 flex flex-col items-center justify-end transition-[filter,opacity] duration-300 ${
                    !isFront ? "cursor-pointer hover:opacity-80" : ""
                  }`}
                >
                  {/* Contact Shadow on Floor Line */}
                  <div className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-44 rounded-[50%] bg-neutral-950/20 blur-[6px]" />

                  {/* Model Cutout Image */}
                  <div className="relative h-[340px] sm:h-[400px] lg:h-[480px] w-auto max-w-[340px] flex items-end">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={outfit.cutout_url}
                      alt={outfit.title}
                      loading="eager"
                      className="h-full w-auto max-w-full object-contain object-bottom pointer-events-none drop-shadow-sm"
                    />

                    {/* Numbered Pins directly on Front Model */}
                    {isFront && (
                      <div className="pointer-events-auto absolute inset-0">
                        {outfit.pieces.map((piece) => {
                          if (piece.pin_left == null || piece.pin_top == null) {
                            return null;
                          }
                          const isHighlighted = highlightedPieceId === piece.id;

                          return (
                            <button
                              key={piece.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedPieceId(piece.id);
                              }}
                              onMouseEnter={() => setHighlightedPieceId(piece.id)}
                              onMouseLeave={() => setHighlightedPieceId(null)}
                              style={{
                                left: `${piece.pin_left}%`,
                                top: `${piece.pin_top}%`,
                              }}
                              aria-label={`Piece ${piece.pin_number}: ${piece.category}`}
                              className={`absolute z-35 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold shadow-md transition-all duration-200 ${
                                isHighlighted
                                  ? "scale-125 bg-rose-600 text-white ring-4 ring-rose-200"
                                  : "bg-[#151413]/90 text-white backdrop-blur ring-2 ring-white/90 hover:scale-115 hover:bg-rose-600"
                              }`}
                            >
                              {piece.pin_number}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls Row (bottom of stage) */}
          <div className="relative z-30 flex items-center justify-between border-t border-[#c8c8c8]/50 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous outfit"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c8c8c8] bg-white text-[#151413] transition hover:bg-neutral-100 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next outfit"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c8c8c8] bg-white text-[#151413] transition hover:bg-neutral-100 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 01-0N Ticks + Active Name */}
            <div className="flex items-center gap-2 overflow-hidden px-2 sm:gap-3">
              <div className="flex items-center gap-1">
                {outfits.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to outfit ${i + 1}`}
                    className={`h-1.5 transition-all ${
                      i === targetIdx
                        ? "w-6 rounded-full bg-rose-600"
                        : "w-2 rounded-full bg-[#c8c8c8] hover:bg-[#66625c]"
                    }`}
                  />
                ))}
              </div>
              <span className="hidden text-xs font-semibold text-[#151413] sm:inline">
                0{targetIdx + 1}
              </span>
              <span className="truncate text-xs font-medium text-[#66625c]">
                {activeOutfit.title}
              </span>
            </div>

            {/* Pause / Play Button with Progress indicator */}
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
              className="flex items-center gap-1.5 rounded-full border border-[#c8c8c8] bg-white px-2.5 py-1 text-xs font-semibold text-[#151413] transition hover:bg-neutral-100"
            >
              {isPlaying ? (
                <>
                  <svg className="h-3 w-3 text-rose-600" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3 text-[#151413]" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  <span className="hidden sm:inline">Play</span>
                </>
              )}
            </button>
          </div>

          {/* Autoplay 2px Progress Line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#c8c8c8]/40">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-rose-600 transition-all duration-75 ease-linear"
            />
          </div>
        </div>

        {/* ================= RIGHT / PANEL "IN THIS LOOK" ================= */}
        <div className="flex flex-col justify-between border-t border-[#c8c8c8]/70 bg-white lg:border-l lg:border-t-0">
          {/* Header */}
          <div className="flex items-baseline justify-between border-b border-[#c8c8c8]/60 px-5 py-4">
            <h2 className={`${playfair.className} text-xl font-bold tracking-tight text-[#151413]`}>
              In this look
            </h2>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-[#66625c]">
              {pieceRows.length} {pieceRows.length === 1 ? "piece" : "pieces"}
            </span>
          </div>

          {/* Piece Rows: Desktop vertical scroll, Mobile horizontal snap */}
          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 lg:space-y-3">
            {/* Mobile Snap List (<=749px) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 no-scrollbar lg:hidden">
              {pieceRows.map(({ piece, selectedTier, activeProduct }) => {
                const isHighlighted = highlightedPieceId === piece.id;

                return (
                  <div
                    key={`${activeOutfit.id}-${piece.id}`}
                    onMouseEnter={() => setHighlightedPieceId(piece.id)}
                    onMouseLeave={() => setHighlightedPieceId(null)}
                    className={`w-[82vw] max-w-[310px] shrink-0 snap-center rounded-2xl border p-3 transition-all duration-200 ${
                      isHighlighted
                        ? "border-rose-400 bg-rose-50/40 shadow-sm"
                        : "border-[#c8c8c8]/60 bg-white hover:border-[#c8c8c8]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Product Thumbnail (swaps with tier) */}
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeProduct?.product_image_url || piece.image_url}
                          alt={activeProduct?.product_name || piece.category}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300"
                        />
                        {piece.pin_number != null && (
                          <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#151413] text-[9px] font-bold text-white">
                            {piece.pin_number}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#151413]">
                            {CATEGORY_LABELS[piece.category] ?? piece.category}
                          </p>
                          <span className="text-xs font-bold text-[#151413]">
                            {activeProduct ? formatINR(activeProduct.price_inr) : "—"}
                          </span>
                        </div>

                        <p className="mt-0.5 line-clamp-1 text-xs text-[#66625c]">
                          {activeProduct?.product_name || "Look option"}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {activeProduct?.store || "Demo Store"}
                        </p>
                      </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="mt-3 flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-medium text-[#66625c]">
                      {(["thrift", "mid", "premium"] as const).map((tier) => {
                        const active = selectedTier === tier;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() =>
                              setSelectedTiers((prev) => ({ ...prev, [piece.id]: tier }))
                            }
                            className={`flex-1 rounded-md py-1 capitalize transition-all ${
                              active
                                ? "bg-white font-semibold text-rose-600 shadow-sm"
                                : "hover:text-[#151413]"
                            }`}
                          >
                            {tier}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Vertical List (>=750px) */}
            <div className="hidden lg:block space-y-3">
              {pieceRows.map(({ piece, selectedTier, activeProduct }) => {
                const isHighlighted = highlightedPieceId === piece.id;

                return (
                  <div
                    key={`${activeOutfit.id}-${piece.id}`}
                    onMouseEnter={() => setHighlightedPieceId(piece.id)}
                    onMouseLeave={() => setHighlightedPieceId(null)}
                    className={`rounded-2xl border p-3 transition-all duration-200 ${
                      isHighlighted
                        ? "border-rose-400 bg-rose-50/40 shadow-sm"
                        : "border-[#c8c8c8]/60 bg-white hover:border-[#c8c8c8]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Product Thumbnail (swaps with tier) */}
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeProduct?.product_image_url || piece.image_url}
                          alt={activeProduct?.product_name || piece.category}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300"
                        />
                        {piece.pin_number != null && (
                          <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#151413] text-[9px] font-bold text-white">
                            {piece.pin_number}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#151413]">
                            {CATEGORY_LABELS[piece.category] ?? piece.category}
                          </p>
                          <span className="text-xs font-bold text-[#151413]">
                            {activeProduct ? formatINR(activeProduct.price_inr) : "—"}
                          </span>
                        </div>

                        <p className="mt-0.5 line-clamp-1 text-xs text-[#66625c]">
                          {activeProduct?.product_name || "Option item"}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {activeProduct?.store || "Demo Store"}
                        </p>

                        {/* Segmented Control */}
                        <div className="mt-2.5 inline-flex w-full rounded-lg bg-neutral-100 p-0.5 text-[11px] font-medium text-[#66625c]">
                          {(["thrift", "mid", "premium"] as const).map((tier) => {
                            const active = selectedTier === tier;
                            return (
                              <button
                                key={tier}
                                type="button"
                                onClick={() =>
                                  setSelectedTiers((prev) => ({ ...prev, [piece.id]: tier }))
                                }
                                className={`flex-1 rounded-md py-0.5 capitalize transition-all ${
                                  active
                                    ? "bg-white font-semibold text-rose-600 shadow-sm"
                                    : "hover:text-[#151413]"
                                }`}
                              >
                                {tier}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer "Complete the look" */}
          <div className="border-t border-[#c8c8c8]/70 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#151413]">
                  Complete the look
                </p>
                <p className="text-[11px] text-[#66625c]">
                  All thrift ₹{allThriftTotal.toLocaleString("en-IN")} • All premium ₹
                  {allPremiumTotal.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#151413]">
                  {formatINR(selectedTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/outfit/${activeOutfit.id}`}
                className="flex-1 rounded-full bg-[#151413] py-2.5 text-center text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                Shop full look
              </Link>
              <SaveButton outfitId={activeOutfit.id} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
