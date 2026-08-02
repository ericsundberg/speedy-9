import { describe, expect, it } from "vitest";
import {
  STAGE_REGISTRY,
} from "../game/stage-registry";
import {
  createStage,
} from "./stage-factory";

describe("stage factory", () => {
  it("creates a stage for every registry entry", () => {
    for (const definition of STAGE_REGISTRY) {
      expect(createStage(definition.id).id).toBe(definition.id);
    }
  });

  it("returns independent stage instances", () => {
    expect(createStage("deadeye")).not.toBe(
      createStage("deadeye"),
    );
  });

  it("provides the Phase 6 lifecycle methods", () => {
    const stage = createStage("vector-maze");

    expect(typeof stage.mount).toBe("function");
    expect(typeof stage.start).toBe("function");
    expect(typeof stage.restart).toBe("function");
    expect(typeof stage.destroy).toBe("function");
  });
});
