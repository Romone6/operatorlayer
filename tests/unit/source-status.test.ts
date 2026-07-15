import { describe, expect, it } from "vitest";

import { assertStatusTransition } from "@/lib/source-status";

describe("source status transitions", () => {
  it("allows uploaded to extracting", () => {
    expect(() => assertStatusTransition("uploaded", "extracting")).not.toThrow();
  });

  it("blocks uploaded to extracted", () => {
    expect(() => assertStatusTransition("uploaded", "extracted")).toThrow("Cannot transition source");
  });
});