import { describe, it, expect } from "vitest";
import { handleError } from "./account-api";

describe("handleError — @handle claim grammar", () => {
  it("accepts a plain lowercase handle", () => {
    expect(handleError("oguzhan")).toBeNull();
  });

  it("accepts digits and hyphens", () => {
    expect(handleError("curve-labs-2")).toBeNull();
  });

  it("treats empty as claimable-null (the button gates emptiness)", () => {
    expect(handleError("")).toBeNull();
    expect(handleError("   ")).toBeNull();
  });

  it("rejects uppercase", () => {
    expect(handleError("Oguzhan")).not.toBeNull();
  });

  it("rejects spaces and punctuation", () => {
    expect(handleError("oz yayla")).not.toBeNull();
    expect(handleError("oz_yayla")).not.toBeNull();
    expect(handleError("oz.yayla")).not.toBeNull();
    expect(handleError("oz@yayla")).not.toBeNull();
  });
});
