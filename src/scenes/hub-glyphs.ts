import {
  createSvgElement,
} from "../core/svg";
import type {
  HubGlyphId,
} from "./hub-layout";

function createPath(pathData: string): SVGPathElement {
  return createSvgElement("path", {
    class: "hub-stage__stroke",
    d: pathData,
  });
}

function createNode(
  x: number,
  y: number,
): SVGCircleElement {
  return createSvgElement("circle", {
    class: "hub-stage__node",
    cx: x,
    cy: y,
    r: 4,
  });
}

function createMemoryCell(
  x: number,
  y: number,
): SVGRectElement {
  return createSvgElement("rect", {
    class: "hub-stage__fill",
    x,
    y,
    width: 23,
    height: 23,
    rx: 2,
  });
}

function appendGlyph(
  svg: SVGSVGElement,
  glyph: HubGlyphId,
): void {
  switch (glyph) {
    case "circuit":
      svg.append(
        createPath("M16 29 H37 V17 H61 V39 H84"),
        createPath("M16 67 H36 V51 H62 V72 H84"),
        createNode(16, 29),
        createNode(84, 39),
        createNode(16, 67),
        createNode(84, 72),
      );
      break;

    case "deadeye":
      svg.append(
        createSvgElement("circle", {
          class: "hub-stage__stroke",
          cx: 50,
          cy: 47,
          r: 25,
        }),
        createSvgElement("circle", {
          class: "hub-stage__fill",
          cx: 50,
          cy: 47,
          r: 8,
        }),
        createPath("M50 13 V30 M50 64 V81"),
        createPath("M16 47 H33 M67 47 H84"),
      );
      break;

    case "pong":
      svg.append(
        createSvgElement("rect", {
          class: "hub-stage__fill",
          x: 19,
          y: 25,
          width: 8,
          height: 42,
          rx: 2,
        }),
        createSvgElement("rect", {
          class: "hub-stage__fill",
          x: 73,
          y: 31,
          width: 8,
          height: 42,
          rx: 2,
        }),
        createSvgElement("circle", {
          class: "hub-stage__node",
          cx: 53,
          cy: 45,
          r: 7,
        }),
        createPath("M31 69 L67 25"),
      );
      break;

    case "pit":
      svg.append(
        createPath("M18 62 L41 36 L28 31 Z M18 62 L34 49"),
        createPath("M82 30 L57 48 L73 53 Z M82 30 L65 44"),
        createSvgElement("circle", {
          class: "hub-stage__node",
          cx: 50,
          cy: 47,
          r: 6,
        }),
        createPath("M50 35 V27 M50 59 V67 M38 47 H30 M62 47 H70"),
      );
      break;

    case "tower":
      svg.append(
        createSvgElement("path", {
          class: "hub-stage__fill",
          d: "M27 75 V31 L36 22 L44 31 L52 22 L61 31 L70 22 L77 31 V75 Z",
        }),
        createPath("M27 75 H77"),
        createPath("M39 42 H65 M39 54 H65 M39 66 H65"),
      );
      break;

    case "maze":
      svg.append(
        createPath("M18 20 H80 V35 H34 V48 H69 V63 H29 V76 H83"),
        createNode(18, 20),
        createNode(83, 76),
      );
      break;

    case "memory":
      svg.append(
        createMemoryCell(22, 22),
        createMemoryCell(54, 22),
        createMemoryCell(22, 54),
        createMemoryCell(54, 54),
        createPath("M50 13 V8 M50 87 V82"),
        createPath("M13 50 H8 M92 50 H87"),
      );
      break;

    case "times":
      svg.append(
        createPath("M25 24 L75 72"),
        createPath("M75 24 L25 72"),
        createSvgElement("circle", {
          class: "hub-stage__stroke",
          cx: 50,
          cy: 48,
          r: 31,
        }),
      );
      break;

    case "lock":
      svg.append(
        createSvgElement("circle", {
          class: "hub-stage__stroke",
          cx: 50,
          cy: 46,
          r: 29,
        }),
        createPath("M50 22 V46 L66 58"),
        createSvgElement("path", {
          class: "hub-stage__fill",
          d: "M43 45 A7 7 0 1 1 57 45 A7 7 0 0 1 53 51 V66 H47 V51 A7 7 0 0 1 43 45 Z",
        }),
      );
      break;
  }
}

export function createHubPlaceholderGraphic(
  glyph: HubGlyphId,
  order: number,
): SVGSVGElement {
  const svg = createSvgElement("svg", {
    viewBox: "0 0 100 100",
    preserveAspectRatio: "xMidYMid meet",
    focusable: "false",
    "aria-hidden": "true",
  });

  svg.classList.add(
    "hub-stage__graphic",
    `hub-stage__graphic--${glyph}`,
  );

  svg.append(
    createSvgElement("rect", {
      class: "hub-stage__graphic-backdrop",
      x: 7,
      y: 7,
      width: 86,
      height: 86,
      rx: 4,
    }),
  );

  appendGlyph(svg, glyph);

  const index = createSvgElement("text", {
    class: "hub-stage__graphic-index",
    x: 50,
    y: 91,
    "text-anchor": "middle",
  });

  index.textContent = order.toString().padStart(2, "0");
  svg.append(index);

  return svg;
}
