import { useRef, useState } from "react"
import Navbar from "@/components/navbar";

const Poetry = () => {
  const runeText = "ᛞ ᚱ ᚨ ᚢ ᛗ ᚱ"

  const poems = [
    {
      title: "Rain",
      cardImage: "/poetry/rain-card.webp",
      cardPlaceholder: "/poetry/rain-card-tiny.webp",
      poemImage: "/poetry/rain.webp",
    },
    {
      title: "Rebel",
      cardImage: "/poetry/rebel-card.webp",
      cardPlaceholder: "/poetry/rebel-card-tiny.webp",
      poemImage: "/poetry/rebel.webp",
    },
    {
      title: "Winter",
      cardImage: "/poetry/winter-card.webp",
      cardPlaceholder: "/poetry/winter-card-tiny.webp",
      poemImage: "/poetry/winter.webp",
    },
    {
      title: "Ebony",
      cardImage: "/poetry/ebony-card.webp",
      cardPlaceholder: "/poetry/ebony-card-tiny.webp",
      poemImage: "/poetry/ebony.webp",
    },
    
  ]

  const [displayedPoem, setDisplayedPoem] = useState<(typeof poems)[number] | null>(null)
  const [animating, setAnimating] = useState(false)
  const [loadedCards, setLoadedCards] = useState<Record<string, boolean>>({})
  const [poemLoading, setPoemLoading] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)
  const [flyingCard, setFlyingCard] = useState<{
    poem: (typeof poems)[number]
    from: { top: number; left: number; width: number; height: number }
    to: { top: number; left: number; width: number; height: number }
    phase: "start" | "end"
  } | null>(null)

  const slotRef = useRef<HTMLButtonElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const loadPoem = (poem: (typeof poems)[number], onReady: () => void) => {
    setPoemLoading(true)

    const poemImage = new Image()
    poemImage.src = poem.poemImage

    const revealPoem = () => {
      setPoemLoading(false)
      onReady()
    }

    if (poemImage.complete) {
      revealPoem()
      return
    }

    poemImage.onload = revealPoem
    poemImage.onerror = revealPoem
  }

  const startCardAnimation = (poem: (typeof poems)[number]) => {
    if (animating) {
      return
    }

    if (window.innerWidth < 768) {
      loadPoem(poem, () => {
        setDisplayedPoem(poem)
        setAnimating(false)
        setContentVisible(true)
      })
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
    <div className="min-h-screen">
      <Navbar />

      <div className="grid gap-6 p-3 md:h-[calc(100vh-72px)] md:grid-cols-[minmax(0,1fr)_clamp(8rem,16vw,12rem)]">

        {/* This section holds the poem slot and the card slot */}
        <section className="min-w-0 rounded-3xl border border-border bg-muted/70 p-4 md:h-full md:min-h-0">
          <div className="flex h-full min-h-[50vh] min-w-0 flex-col gap-4 md:min-h-0 md:grid md:grid-cols-[minmax(0,1fr)_clamp(7rem,10vw,9rem)]">
            
            {/* Poem slot */}
            <div className="relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/25 p-4">
              {/* Background */}
              <div
                className={`absolute inset-4 flex items-center justify-center select-none text-5xl transition-colors duration-300 ${poemLoading ? "z-10 text-sky-200/80 [animation:poem-rune-loading_1.7s_ease-in-out_infinite]" : "text-foreground/15"}`}
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
              
                {/* Runic Border */}
                <div className={`pointer-events-none absolute -inset-3 rounded-[1.4rem] transition-opacity duration-300 ${displayedPoem ? "opacity-100" : "opacity-45"}`}>
                    <div className={`absolute left-5 right-5 top-1 overflow-hidden text-[10px] tracking-[0.22em] transition-all duration-300 ${displayedPoem ? (contentVisible ? "text-sky-300/85 drop-shadow-[0_0_10px_rgba(56,189,248,0.55)]" : "text-foreground/25") : "text-foreground/25"}`}>
                      {runeText}
                    </div>
                    <div className={`absolute bottom-2 left-5 right-5 overflow-hidden text-right text-[10px] tracking-[0.22em] transition-all duration-300 ${displayedPoem ? (contentVisible ? "text-sky-300/85 drop-shadow-[0_0_10px_rgba(56,189,248,0.55)]" : "text-foreground/25") : "text-foreground/25"}`}>
                      {runeText}
                    </div>
                    <div className={`absolute bottom-5 left-1 top-5 overflow-hidden text-[10px] tracking-[0.12em] [writing-mode:vertical-rl] transition-all duration-300 ${displayedPoem ? (contentVisible ? "text-sky-300/85 drop-shadow-[0_0_10px_rgba(56,189,248,0.55)]" : "text-foreground/25") : "text-foreground/25"}`}>
                      {runeText+runeText}
                    </div>
                    <div className={`absolute bottom-5 right-1 top-5 overflow-hidden text-[10px] tracking-[0.12em] [writing-mode:vertical-rl] rotate-180 transition-all duration-300 ${displayedPoem ? (contentVisible ? "text-sky-300/85 drop-shadow-[0_0_10px_rgba(56,189,248,0.55)]" : "text-foreground/25") : "text-foreground/25"}`}>
                      {runeText+runeText}
                    </div>
                </div>

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
                  className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-background/40">

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
        <section className="min-w-0 rounded-3xl border border-border bg-muted/70 md:h-full min-h-0">
          <div className="flex overflow-x-auto md:h-full md:flex-col md:overflow-y-auto md:overflow-x-hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {poems.map((poem, index) => {
              const isDisplayed = displayedPoem?.title === poem.title
              const cardLoaded = loadedCards[poem.title]

              return (
                <div
                  key={poem.title}
                  className="shrink-0 px-3 py-3 first:pl-4 last:pr-4 md:w-full md:first:pt-4 md:last:pb-4"
                >
                  <button
                    ref={(node) => {
                      cardRefs.current[poem.title] = node
                    }}
                    type="button"
                    onClick={() => startCardAnimation(poem)}
                    disabled={isDisplayed}
                    className={`group relative w-28 shrink-0 overflow-hidden rounded-2xl border bg-white transition-all duration-200 md:w-full ${isDisplayed ? "cursor-default border-border opacity-45" : "cursor-pointer border-border hover:-translate-y-1 hover:rotate-[-2.5deg] hover:scale-[1.02] hover:border-foreground hover:shadow-[0_0_45px_rgba(0,0,0,0.28)]"}`}
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
                      className={`relative z-10 aspect-[5/7] w-full object-contain transition-[opacity,transform] duration-300 ${cardLoaded ? "opacity-100" : "opacity-0"} ${isDisplayed ? "" : "group-hover:scale-[1.04]"}`}
                    />
                    {!isDisplayed && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100"/>
                    )}
                  </button>
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
