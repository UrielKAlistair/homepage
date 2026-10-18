// The poems, shared by the Poetry page and the hand of cards on the home page

export type Poem = { title: string; cardImage: string; cardPlaceholder: string; poemImage: string };

export const poems: Poem[] = [
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
];

// The same name on a card in both places lets the browser fly it from one page to the other
export const poemCardTransition = (poem: Poem) => `poem-card-${poem.title.toLowerCase()}`;
