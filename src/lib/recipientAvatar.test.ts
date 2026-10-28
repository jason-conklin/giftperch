import assert from "node:assert/strict";
import test from "node:test";
import { getRecipientInitialAvatarStyle } from "./recipientAvatar";

test("returns the configured male and female fallback avatar colors", () => {
  assert.deepEqual(getRecipientInitialAvatarStyle("male"), {
    backgroundColor: "#D9E9F5",
    color: "#365A72",
  });
  assert.deepEqual(getRecipientInitialAvatarStyle("female"), {
    backgroundColor: "#F5DFE7",
    color: "#87566A",
  });
});

test("preserves neutral CSS styling for unspecified and unsupported genders", () => {
  assert.equal(getRecipientInitialAvatarStyle(null), undefined);
  assert.equal(getRecipientInitialAvatarStyle(undefined), undefined);
  assert.equal(getRecipientInitialAvatarStyle(""), undefined);
  assert.equal(getRecipientInitialAvatarStyle("other"), undefined);
  assert.equal(getRecipientInitialAvatarStyle("unknown"), undefined);
});
