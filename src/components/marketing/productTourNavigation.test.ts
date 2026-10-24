import assert from "node:assert/strict";
import test from "node:test";
import { getProductTourEntryPath } from "./productTourNavigation";

test("routes authenticated Product Tour visitors directly to Gift Ideas", () => {
  assert.equal(getProductTourEntryPath("authenticated"), "/gifts");
});

test("routes visitors without a confirmed session through sign-up with a Gift Ideas redirect", () => {
  assert.equal(
    getProductTourEntryPath("unauthenticated"),
    "/auth/signup?redirect=%2Fgifts",
  );
  assert.equal(
    getProductTourEntryPath("loading"),
    "/auth/signup?redirect=%2Fgifts",
  );
});
