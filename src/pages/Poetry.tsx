import { useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import Navbar from "@/components/navbar";
import BorderTrace from "@/components/bordertrace";
import ExitButton from "@/components/exit-button";
import { poems, poemCardTransition } from "./poems";
import type { Poem } from "./poems";

// Back to the home page: the cards drift back into the hand one after another, while the page
// crossfades into the home page's poetry panel underneath
const returnMs = 850;
const returnStagger = 70;
const returnStyle = poems
    .map(poemCardTransition)
    .map((name, i) =>
        `::view-transition-group(${name}), ::view-transition-old(${name}), ::view-transition-new(${name}) ` +
        `{ animation-duration: ${returnMs}ms; animation-delay: ${i * returnStagger}ms; animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1); animation-fill-mode: both; }`
    )
    .join("\n");

const Poetry = () => {
  const poemGlowMs = 1200 // one full pulse of the ❖ loading glow


  const [displayedPoem, setDisplayedPoem] = useState<Poem | null>(null)
  const [animating, setAnimating] = useState(false)
  // Arriving from the hand of cards on the home page, the cards fly straight into the tray,
  // so they start out drawn and loaded instead of tracing their borders in
  const fromDeck = (useLocation().state as { fromDeck?: boolean } | null)?.fromDeck === true
  const allCards = Object.fromEntries(poems.map((poem) => [poem.title, true]))
  const [loadedCards, setLoadedCards] = useState<Record<string, boolean>>(fromDeck ? allCards : {})
  const [poemLoading, setPoemLoading] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)
  const [tracedCards, setTracedCards] = useState<Record<string, boolean>>(fromDeck ? allCards : {})
  const [flyingCard, setFlyingCard] = useState<{
    poem: Poem
    from: { top: number; left: number; width: number; height: number }
    to: { top: number; left: number; width: number; height: number }
    phase: "start" | "end"
  } | null>(null)

  const slotRef = useRef<HTMLButtonElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const loadPoem = (poem: Poem, onReady: () => void) => {
    setPoemLoading(true)

    const poemImage = new Image()
    poemImage.src = poem.poemImage
    const startedAt = performance.now()

    // The loading glow always plays for at least poemGlowMs, even when the image is cached
    const revealPoem = () => {
      window.setTimeout(() => {
        setPoemLoading(false)
        onReady()
      }, Math.max(0, poemGlowMs - (performance.now() - startedAt)))
    }

    if (poemImage.complete) {
      revealPoem()
      return
    }

    poemImage.onload = revealPoem
    poemImage.onerror = revealPoem
  }

  const startCardAnimation = (poem: Poem) => {
    if (animating) {
      return
    }

    // No card slot on mobile: fade the current poem out, breathe the loading glow, then fade the new one in
    if (window.innerWidth < 768) {
      setAnimating(true)
      setContentVisible(false)

      window.setTimeout(() => {
        loadPoem(poem, () => {
          setDisplayedPoem(poem)
          // Let the new poem mount hidden first so it fades in rather than snapping
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setContentVisible(true)
              setAnimating(false)
            })
          })
        })
      }, displayedPoem ? 300 : 0)
      return
    }

    const cardNode = cardRefs.current[poem.title]
    const slotNode = slotRef.current

    if (!cardNode || !slotNode) {return}

    const from = cardNode.getBoundingClientRect()
    const to = slotNode.getBoundingClientRect()
    
    setContentVisible(false)
    setAnimating(true)
    setFlyingCard({
      poem,
      from: {
        top: from.top,
        left: from.left,
        width: from.width,
        height: from.height,
      },
      to: {
        top: to.top,
        left: to.left,
        width: to.width,
        height: to.height,
      },
      phase: "start",
    })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyingCard((currentCard) =>
          currentCard && currentCard.poem.title === poem.title
            ? { ...currentCard, phase: "end" }
            : currentCard
        )
      })
    })
  }

  const finishCardAnimation = () => {
    if (!flyingCard || flyingCard.phase !== "end") {
      return
    }

    const landedPoem = flyingCard.poem
    const revealPoem = () => {
      setDisplayedPoem(landedPoem)
      setContentVisible(true)
    
      window.setTimeout(() => {
        setAnimating(false)
        setFlyingCard(null)
      }, 200)
    }

    loadPoem(landedPoem, revealPoem)
  }

  return (
    <div className="min-h-screen bg-night">
      <Navbar />

      <div className="grid gap-6 p-3 md:h-[calc(100vh-var(--nav-h))] md:grid-cols-[minmax(0,1fr)_clamp(8rem,16vw,12rem)]">

        {/* This section holds the poem slot and the card slot */}
        <section className="min-w-0 rounded-3xl border border-white/10 bg-night-panel p-4 md:h-full md:min-h-0">
          <div className="flex h-full min-h-[50vh] min-w-0 flex-col gap-4 md:min-h-0 md:grid md:grid-cols-[minmax(0,1fr)_clamp(7rem,10vw,9rem)]">
            
            {/* Poem slot */}
            <div className="relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-black/30 p-4">
              <ExitButton returnTo="poetry" transitionStyle={returnStyle} className="absolute left-3 top-3 z-20" />
              {/* Background */}
              <div
                className={`absolute inset-4 flex items-center justify-center select-none text-5xl transition-colors duration-300 ${poemLoading ? "z-10 text-sky-200/80" : "text-foreground/15"}`}
                style={poemLoading ? { animation: `poem-rune-loading ${poemGlowMs}ms ease-in-out infinite` } : undefined}
              >
                ❖
              </div>

              {displayedPoem && (
                <img
                  src={displayedPoem.poemImage}
                  alt={displayedPoem.title}
                  className={`relative z-10 max-h-full max-w-full rounded-2xl border border-border object-contain transition-opacity duration-300 ${contentVisible ? "opacity-100" : "opacity-0"}`}
                />
              )}
            </div>

            {/* Card Slot */}
            <div className="hidden md:flex md:h-full md:items-center md:justify-center">
              <div className="relative aspect-[5/7] w-full">
              
                {/* Clickable card Image on the slot */}
                <button
                  ref={slotRef}
                  type="button"
                  onClick={() => {
                    setContentVisible(false)
                    setPoemLoading(false)

                    window.setTimeout(() => {
                      setDisplayedPoem(null)
                      setContentVisible(true)
                    }, 300)
                  }}
                  className="relative h-full w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-black/30">

                  <div className="absolute inset-0 h-full w-full flex items-center justify-center text-3xl text-foreground/15">
                      ✦
                  </div>
                
                {displayedPoem && (
                  <div className={`relative z-10 h-full w-full rounded-2xl bg-white transition-opacity duration-300 ${contentVisible ? "opacity-100" : "opacity-0"}`}>
                    <img
                      src={displayedPoem.cardImage}
                      alt={`${displayedPoem.title} slotted card`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                </button>
              </div>
            </div>

          </div>

        </section>
        
        {/* This section holds the scrollable cards for the poems */}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-night-panel md:h-full min-h-0">
          <div className="flex overflow-x-auto md:h-full md:flex-col md:overflow-y-auto md:overflow-x-hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {poems.map((poem) => {
              const isDisplayed = displayedPoem?.title === poem.title
              const cardLoaded = loadedCards[poem.title]
              const cardTraced = tracedCards[poem.title]

              return (
                <div
                  key={poem.title}
                  className="shrink-0 px-3 py-3 first:pl-4 last:pr-4 md:w-full md:first:pt-4 md:last:pb-4"
                >
                  {/* Wrapper matches the card's box, so the trace lines up with its border without being clipped */}
                  <div className="relative">
                    {!fromDeck && <BorderTrace
                      radius={16}
                      onDone={() =>
                        setTracedCards((current) =>
                          current[poem.title] ? current : { ...current, [poem.title]: true }
                        )
                      }
                    />}
                    <button
                      ref={(node) => {
                        cardRefs.current[poem.title] = node
                      }}
                      type="button"
                      onClick={() => startCardAnimation(poem)}
                      disabled={isDisplayed}
                      style={{ viewTransitionName: poemCardTransition(poem) }}
                      className={`group relative block w-28 shrink-0 overflow-hidden rounded-2xl border bg-white transition-all duration-200 md:w-full ${!cardTraced ? "pointer-events-none opacity-0" : isDisplayed ? "cursor-default border-border opacity-45" : "poem-card cursor-pointer border-border"}`}
                    >
                      <img
                        src={poem.cardPlaceholder}
                        alt=""
                        aria-hidden="true"
                        className={`absolute inset-0 aspect-[5/7] h-full w-full scale-110 object-contain blur-xl transition-opacity duration-300 ${cardLoaded ? "opacity-0" : "opacity-100"}`}
                      />
                      <img
                        src={poem.cardImage}
                        alt={`${poem.title} card`}
                        decoding="async"
                        onLoad={() => {
                          setLoadedCards((current) =>
                            current[poem.title] ? current : { ...current, [poem.title]: true }
                          )
                        }}
                        className={`relative z-10 aspect-[5/7] w-full object-contain transition-[opacity,transform] duration-300 ${cardLoaded ? "opacity-100" : "opacity-0"} ${isDisplayed ? "" : "poem-card-art"}`}
                      />
                      {/* Fixed-height shade above the image; the card art is letterboxed, so it can't sit in the gaps */}
                      {!isDisplayed && (
                        <div className="poem-card-shade pointer-events-none absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {flyingCard && (
        <div
          className="fixed z-50 overflow-hidden rounded-2xl border border-border bg-white shadow-xl transition-[transform] duration-500 ease-out"
          style={{
            top: `${flyingCard.from.top}px`,
            left: `${flyingCard.from.left}px`,
            width: `${flyingCard.from.width}px`,
            height: `${flyingCard.from.height}px`,
            transform:
              flyingCard.phase === "start"
                ? "translate3d(0, 0, 0) scale(1, 1)"
                : `translate3d(${flyingCard.to.left - flyingCard.from.left}px, ${flyingCard.to.top - flyingCard.from.top}px, 0) scale(${flyingCard.to.width / flyingCard.from.width}, ${flyingCard.to.height / flyingCard.from.height})`,
            transformOrigin: "top left",
          }}
          onTransitionEnd={finishCardAnimation}
        >
          <img
            src={flyingCard.poem.cardImage}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}
    </div>
  )
}

export default Poetry
