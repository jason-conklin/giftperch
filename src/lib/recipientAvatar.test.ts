import assert from "node:assert/strict";
import test from "node:test";
import {
  getRecipientAvatarVisual,
  getRecipientInitialAvatarStyle,
  getRecipientInitials,
} from "./recipientAvatar";

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

test("builds stable initials including a fallback for missing names", () => {
  assert.equal(getRecipientInitials("Alex Morgan"), "AM");
  assert.equal(getRecipientInitials("  alex   morgan  "), "AM");
  assert.equal(getRecipientInitials(""), "GP");
  assert.equal(getRecipientInitials(null), "GP");
});

test("prefers uploaded and preset avatars before the initials fallback", () => {
  assert.deepEqual(
    getRecipientAvatarVisual({
      name: "Alex",
      avatar_url: "https://images.example.com/alex.jpg",
      avatar_icon: "man",
    }),
    {
      kind: "image",
      src: "https://images.example.com/alex.jpg",
      alt: "Alex avatar",
    },
  );
  assert.deepEqual(
    getRecipientAvatarVisual({
      name: "Alex",
      avatar_url: null,
      avatar_icon: "man",
    }),
    { kind: "preset", src: "/man_icon.png", alt: "Man" },
  );
  assert.deepEqual(
    getRecipientAvatarVisual({
      name: "Alex",
      avatar_url: null,
      avatar_icon: null,
    }),
    { kind: "initials", text: "A" },
  );
});
