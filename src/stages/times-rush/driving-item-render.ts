import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import {
  DRIVING_VIEW_WIDTH,
} from "./driving-model";
import type {
  DrivingBananaState,
  DrivingPickupState,
  DrivingState,
} from "./driving-model";
import {
  projectDrivingObject,
} from "./driving-projection";
import type {
  DrivingTrack,
  ProjectedDrivingRoadPoint,
} from "./driving-projection";

export interface DrivingItemView {
  readonly layer: SVGGElement;
  readonly pickupElements: Map<
    string,
    SVGGElement
  >;
  readonly missileElements: Map<
    string,
    SVGGElement
  >;
  readonly bananaElements: Map<
    string,
    SVGGElement
  >;
  readonly boostStreaks: readonly SVGLineElement[];
}

function createBoostPickup():
readonly SVGElement[] {
  return [
    createSvgElement("polyline", {
      class: "driving-stage__pickup-wire",
      points: "-22,-18 0,0 -22,18",
    }),
    createSvgElement("polyline", {
      class: "driving-stage__pickup-wire",
      points: "0,-18 22,0 0,18",
    }),
    createSvgElement("polygon", {
      class: "driving-stage__pickup-frame",
      points: "-30,-27 30,-27 38,0 30,27 -30,27 -38,0",
    }),
  ];
}

function createMissilePickup():
readonly SVGElement[] {
  return [
    createSvgElement("polygon", {
      class: "driving-stage__pickup-wire",
      points: "-25,7 9,7 27,0 9,-7 -25,-7",
    }),
    createSvgElement("polyline", {
      class: "driving-stage__pickup-wire",
      points: "-18,-7 -29,-20 -7,-7",
    }),
    createSvgElement("polyline", {
      class: "driving-stage__pickup-wire",
      points: "-18,7 -29,20 -7,7",
    }),
    createSvgElement("polygon", {
      class: "driving-stage__pickup-frame",
      points: "-36,-27 36,-27 43,0 36,27 -36,27 -43,0",
    }),
  ];
}

function createPickupElement(
  pickup: DrivingPickupState,
): SVGGElement {
  const element = createSvgElement("g", {
    class:
      "driving-stage__pickup "
      + `driving-stage__pickup--${pickup.kind}`,
    "data-pickup-id": pickup.id,
  });

  element.append(
    ...(
      pickup.kind === "boost"
        ? createBoostPickup()
        : createMissilePickup()
    ),
  );

  return element;
}

function createMissileElement():
SVGGElement {
  const element = createSvgElement("g", {
    class: "driving-stage__missile",
  });

  element.append(
    createSvgElement("polygon", {
      class: "driving-stage__missile-wire",
      points: "-24,6 8,6 25,0 8,-6 -24,-6",
    }),
    createSvgElement("polyline", {
      class: "driving-stage__missile-wire",
      points: "-16,-6 -27,-16 -5,-6",
    }),
    createSvgElement("polyline", {
      class: "driving-stage__missile-wire",
      points: "-16,6 -27,16 -5,6",
    }),
    createSvgElement("line", {
      class: "driving-stage__missile-flame",
      x1: -25,
      y1: 0,
      x2: -43,
      y2: 0,
    }),
  );

  return element;
}

function createSafetyConeElement(
  banana: DrivingBananaState,
): SVGGElement {
  const element = createSvgElement("g", {
    class: "driving-stage__safety-cone",
    "data-banana-id": banana.id,
  });

  element.append(
    createSvgElement("polygon", {
      class: "driving-stage__safety-cone-outline",
      points: "0,-52 31,24 -31,24",
    }),
    createSvgElement("line", {
      class: "driving-stage__safety-cone-stripe",
      x1: -14,
      y1: -12,
      x2: 14,
      y2: -12,
    }),
    createSvgElement("line", {
      class: "driving-stage__safety-cone-stripe",
      x1: -22,
      y1: 8,
      x2: 22,
      y2: 8,
    }),
    createSvgElement("polygon", {
      class: "driving-stage__safety-cone-base",
      points: "-40,24 40,24 48,36 -48,36",
    }),
  );

  return element;
}

export function createDrivingItemView(
  pickups: readonly DrivingPickupState[],
  bananas: readonly DrivingBananaState[],
): DrivingItemView {
  const layer = createSvgElement("g", {
    class: "driving-stage__item-layer",
  });

  const boostLayer = createSvgElement("g", {
    class: "driving-stage__boost-layer",
  });

  const boostStreaks = Array.from(
    { length: 8 },
    (_, index) => createSvgElement("line", {
      class: "driving-stage__boost-streak",
      "data-streak": index,
    }),
  );

  boostLayer.append(...boostStreaks);
  layer.append(boostLayer);

  const pickupElements = new Map<
    string,
    SVGGElement
  >();

  for (const pickup of pickups) {
    const element = createPickupElement(pickup);

    pickupElements.set(pickup.id, element);
    layer.append(element);
  }

  const bananaElements = new Map<
    string,
    SVGGElement
  >();

  for (const banana of bananas) {
    const element = createSafetyConeElement(banana);

    bananaElements.set(banana.id, element);
    layer.append(element);
  }

  return {
    layer,
    pickupElements,
    missileElements: new Map(),
    bananaElements,
    boostStreaks,
  };
}

function renderPickups(
  view: DrivingItemView,
  state: DrivingState,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  track: DrivingTrack,
): void {
  for (const pickup of state.pickups) {
    const element =
      view.pickupElements.get(pickup.id);

    if (element === undefined) {
      continue;
    }

    if (pickup.collected) {
      setSvgAttributes(element, {
        display: "none",
      });
      continue;
    }

    const projected = projectDrivingObject(
      roadPoints,
      state.player.distance,
      pickup.distance,
      pickup.lateralPosition,
      track.segmentLength,
    );

    if (projected === null) {
      setSvgAttributes(element, {
        display: "none",
      });
      continue;
    }

    const scale =
      0.08 + projected.scale * 0.5;

    const bob =
      Math.sin(
        state.elapsedMs * 0.006
        + pickup.distance,
      )
      * 4
      * projected.scale;

    setSvgAttributes(element, {
      display: "",
      transform:
        `translate(${projected.screenX} ${projected.screenY + bob})`
        + ` scale(${scale})`,
      opacity:
        0.3 + projected.scale * 0.7,
    });
  }
}

function renderBananas(
  view: DrivingItemView,
  state: DrivingState,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  track: DrivingTrack,
): void {
  for (const banana of state.bananas) {
    const element =
      view.bananaElements.get(banana.id);

    if (element === undefined) {
      continue;
    }

    if (!banana.active) {
      setSvgAttributes(element, {
        display: "none",
      });
      continue;
    }

    const projected = projectDrivingObject(
      roadPoints,
      state.player.distance,
      banana.distance,
      banana.lateralPosition,
      track.segmentLength,
    );

    if (projected === null) {
      setSvgAttributes(element, {
        display: "none",
      });
      continue;
    }

    const scale =
      0.105 + projected.scale * 0.52;

    setSvgAttributes(element, {
      display: "",
      transform:
        `translate(${projected.screenX} ${projected.screenY})`
        + ` scale(${scale})`,
      opacity:
        0.3 + projected.scale * 0.7,
    });
  }
}

function renderMissiles(
  view: DrivingItemView,
  state: DrivingState,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  track: DrivingTrack,
): void {
  const activeIds = new Set<string>();

  for (const missile of state.missiles) {
    activeIds.add(missile.id);

    let element =
      view.missileElements.get(missile.id);

    if (element === undefined) {
      element = createMissileElement();
      view.missileElements.set(
        missile.id,
        element,
      );
      view.layer.append(element);
    }

    const projected = projectDrivingObject(
      roadPoints,
      state.player.distance,
      missile.distance,
      missile.lateralPosition,
      track.segmentLength,
    );

    if (projected === null) {
      setSvgAttributes(element, {
        display: "none",
      });
      continue;
    }

    const scale =
      0.08 + projected.scale * 0.42;

    setSvgAttributes(element, {
      display: "",
      transform:
        `translate(${projected.screenX} ${projected.screenY})`
        + ` scale(${scale})`,
      opacity:
        0.45 + projected.scale * 0.55,
    });
  }

  for (
    const [id, element]
    of view.missileElements
  ) {
    if (activeIds.has(id)) {
      continue;
    }

    element.remove();
    view.missileElements.delete(id);
  }
}

function renderBoostStreaks(
  view: DrivingItemView,
  state: DrivingState,
): void {
  const active =
    state.player.boostRemainingMs > 0;

  const carX =
    DRIVING_VIEW_WIDTH / 2
    + state.player.lateralPosition * 108;

  for (
    let index = 0;
    index < view.boostStreaks.length;
    index += 1
  ) {
    const streak = view.boostStreaks[index];

    if (streak === undefined) {
      continue;
    }

    if (!active) {
      setSvgAttributes(streak, {
        display: "none",
      });
      continue;
    }

    const side = index % 2 === 0
      ? -1
      : 1;

    const row = Math.floor(index / 2);

    const phase =
      (
        state.elapsedMs * 0.42
        + row * 31
      ) % 90;

    const x =
      carX
      + side * (30 + row * 17);

    const y =
      615 + phase;

    setSvgAttributes(streak, {
      display: "",
      x1: x,
      y1: y,
      x2: x + side * 9,
      y2: y + 48,
      opacity:
        0.35 + row * 0.13,
    });
  }
}

export function renderDrivingItemView(
  view: DrivingItemView,
  state: DrivingState,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  track: DrivingTrack,
): void {
  renderBoostStreaks(view, state);
  renderPickups(
    view,
    state,
    roadPoints,
    track,
  );
  renderBananas(
    view,
    state,
    roadPoints,
    track,
  );
  renderMissiles(
    view,
    state,
    roadPoints,
    track,
  );
}
