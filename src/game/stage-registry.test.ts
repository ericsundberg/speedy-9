import { describe, expect, it } from "vitest";
import {
  FINAL_STAGE_ID,
  getStageMetadata,
  isFinalStageId,
  isPreliminaryStageId,
  isStageId,
  PRELIMINARY_STAGE_IDS,
  STAGE_REGISTRY,
} from "./stage-registry";

describe("stage registry", () => {
  it("contains the approved nine-stage roster in fixed order", () => {
    expect(STAGE_REGISTRY.map((stage) => stage.id)).toEqual([
      "reverse-circuit",
      "deadeye",
      "pong-blitz",
      "pit-sprint",
      "tower-climb",
      "vector-maze",
      "memory-burst",
      "pace-racer",
      "speed-lock",
    ]);
  });

  it("contains eight preliminary stages and one final stage", () => {
    expect(PRELIMINARY_STAGE_IDS).toHaveLength(8);
    expect(
      STAGE_REGISTRY.filter(
        (stage) => stage.kind === "preliminary",
      ),
    ).toHaveLength(8);
    expect(
      STAGE_REGISTRY.filter(
        (stage) => stage.kind === "final",
      ),
    ).toHaveLength(1);
  });

  it("uses unique stage IDs and display orders", () => {
    expect(
      new Set(STAGE_REGISTRY.map((stage) => stage.id)).size,
    ).toBe(9);
    expect(
      new Set(STAGE_REGISTRY.map((stage) => stage.order)).size,
    ).toBe(9);
  });

  it("keeps the final internal ID while displaying Locked", () => {
    expect(isStageId("deadeye")).toBe(true);
    expect(isStageId("unknown-stage")).toBe(false);
    expect(isPreliminaryStageId("deadeye")).toBe(true);
    expect(isFinalStageId(FINAL_STAGE_ID)).toBe(true);
    expect(getStageMetadata(FINAL_STAGE_ID)).toMatchObject({
      shortName: "Locked",
      displayName: "Locked",
      kind: "final",
      order: 9,
    });
  });
});
