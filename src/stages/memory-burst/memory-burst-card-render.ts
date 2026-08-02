import {
  createSvgElement,
} from "../../core/svg";
import type {
  MemoryBurstCard,
  MemoryBurstSuit,
} from "./memory-burst-model";

interface SuitArtworkDefinition {
  readonly outlinePath: string;
  readonly detailPath: string;
}

interface ReverseGridLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const SUIT_ARTWORK_DEFINITIONS:
Readonly<Record<MemoryBurstSuit, SuitArtworkDefinition>> = {
  spades: {
    outlinePath: [
      "M 50 10",
      "L 22 40",
      "L 16 54",
      "L 24 66",
      "L 38 70",
      "L 48 62",
      "L 44 82",
      "L 34 92",
      "H 66",
      "L 56 82",
      "L 52 62",
      "L 62 70",
      "L 76 66",
      "L 84 54",
      "L 78 40",
      "Z",
    ].join(" "),
    detailPath: [
      "M 50 20",
      "V 72",
      "M 34 50",
      "L 50 34",
      "L 66 50",
    ].join(" "),
  },

  hearts: {
    outlinePath: [
      "M 50 90",
      "L 18 58",
      "V 34",
      "L 28 20",
      "H 40",
      "L 50 30",
      "L 60 20",
      "H 72",
      "L 82 34",
      "V 58",
      "Z",
    ].join(" "),
    detailPath: [
      "M 28 40",
      "L 50 64",
      "L 72 40",
    ].join(" "),
  },

  clubs: {
    outlinePath: [
      "M 50 10",
      "L 40 22",
      "V 34",
      "L 30 26",
      "H 18",
      "L 10 36",
      "V 50",
      "L 18 60",
      "H 34",
      "L 40 54",
      "L 36 76",
      "L 26 92",
      "H 74",
      "L 64 76",
      "L 60 54",
      "L 66 60",
      "H 82",
      "L 90 50",
      "V 36",
      "L 82 26",
      "H 70",
      "L 60 34",
      "V 22",
      "Z",
    ].join(" "),
    detailPath: [
      "M 50 20",
      "V 78",
      "M 28 46",
      "H 72",
    ].join(" "),
  },

  diamonds: {
    outlinePath: [
      "M 50 10",
      "L 82 50",
      "L 50 90",
      "L 18 50",
      "Z",
    ].join(" "),
    detailPath: [
      "M 50 24",
      "L 68 50",
      "L 50 76",
      "L 32 50",
      "Z",
    ].join(" "),
  },
};

const REVERSE_GRID_LINES: readonly ReverseGridLine[] = [
  { x1: 24, y1: 34, x2: 96, y2: 34 },
  { x1: 24, y1: 52, x2: 96, y2: 52 },
  { x1: 24, y1: 70, x2: 96, y2: 70 },
  { x1: 24, y1: 88, x2: 96, y2: 88 },
  { x1: 24, y1: 106, x2: 96, y2: 106 },
  { x1: 24, y1: 124, x2: 96, y2: 124 },

  { x1: 24, y1: 34, x2: 24, y2: 134 },
  { x1: 42, y1: 34, x2: 42, y2: 134 },
  { x1: 60, y1: 34, x2: 60, y2: 134 },
  { x1: 78, y1: 34, x2: 78, y2: 134 },
  { x1: 96, y1: 34, x2: 96, y2: 134 },
];

function createMemoryBurstSuitArtwork(
  suit: MemoryBurstSuit,
): SVGSVGElement {
  const definition =
    SUIT_ARTWORK_DEFINITIONS[suit];

  const artwork = createSvgElement("svg", {
    class:
      `memory-burst-card__suit memory-burst-card__suit--${suit}`,
    viewBox: "0 0 100 100",
    preserveAspectRatio: "xMidYMid meet",
    focusable: "false",
    "aria-hidden": "true",
  });

  const outline = createSvgElement("path", {
    class: "memory-burst-card__suit-outline",
    d: definition.outlinePath,
  });

  const detail = createSvgElement("path", {
    class: "memory-burst-card__suit-detail",
    d: definition.detailPath,
  });

  artwork.append(
    outline,
    detail,
  );

  return artwork;
}

export function createMemoryBurstCardReverseFace():
HTMLElement {
  const face = document.createElement("span");

  face.className =
    "memory-burst-card__face memory-burst-card__face--reverse";

  face.setAttribute(
    "aria-hidden",
    "true",
  );

  const artwork = createSvgElement("svg", {
    class: "memory-burst-card__reverse-artwork",
    viewBox: "0 0 120 168",
    preserveAspectRatio: "xMidYMid meet",
    focusable: "false",
  });

  const outerBorder = createSvgElement("rect", {
    class:
      "memory-burst-card__reverse-border memory-burst-card__reverse-border--outer",
    x: 2,
    y: 2,
    width: 116,
    height: 164,
  });

  const innerBorder = createSvgElement("rect", {
    class:
      "memory-burst-card__reverse-border memory-burst-card__reverse-border--inner",
    x: 10,
    y: 10,
    width: 100,
    height: 148,
  });

  const checkerboard = createSvgElement("g", {
    class: "memory-burst-card__reverse-grid",
  });

  for (const lineDefinition of REVERSE_GRID_LINES) {
    const line = createSvgElement("line", {
      class: "memory-burst-card__reverse-grid-line",
      ...lineDefinition,
    });

    checkerboard.append(line);
  }

  const centerFrame = createSvgElement("rect", {
    class:
      "memory-burst-card__reverse-center-frame",
    x: 36,
    y: 50,
    width: 48,
    height: 68,
  });

  const nine = createSvgElement("path", {
    class: "memory-burst-card__reverse-nine",
    d: [
      "M 44 58",
      "L 52 50",
      "H 68",
      "L 76 58",
      "V 78",
      "L 68 86",
      "H 52",
      "L 44 78",
      "Z",
      "M 52 60",
      "H 68",
      "V 76",
      "H 52",
      "Z",
      "M 76 68",
      "V 104",
      "L 68 112",
      "H 48",
    ].join(" "),
  });

  artwork.append(
    outerBorder,
    innerBorder,
    checkerboard,
    centerFrame,
    nine,
  );

  face.append(artwork);

  return face;
}

export function createMemoryBurstCardFrontFace(
  card: MemoryBurstCard,
): HTMLElement {
  const face = document.createElement("span");

  face.className =
    "memory-burst-card__face memory-burst-card__face--front";

  face.hidden = true;

  face.dataset.rank = String(card.rank);
  face.dataset.suit = card.suit;

  face.setAttribute(
    "aria-hidden",
    "true",
  );

  const upperRank = document.createElement("span");

  upperRank.className =
    "memory-burst-card__rank memory-burst-card__rank--upper";

  upperRank.textContent = String(card.rank);

  const suitArea = document.createElement("span");

  suitArea.className =
    "memory-burst-card__suit-area";

  suitArea.dataset.suit = card.suit;

  const suitArtwork =
    createMemoryBurstSuitArtwork(card.suit);

  suitArea.append(suitArtwork);

  const lowerRank = document.createElement("span");

  lowerRank.className =
    "memory-burst-card__rank memory-burst-card__rank--lower";

  lowerRank.textContent = String(card.rank);

  face.append(
    upperRank,
    suitArea,
    lowerRank,
  );

  return face;
}
