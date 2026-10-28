import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RecipientSelector } from "./RecipientSelector";

const recipients = [
  {
    id: "alex",
    name: "Alex Morgan",
    relationship: "Friend",
    gender: "male",
    avatar_url: null,
    avatar_icon: null,
  },
  {
    id: "snickers",
    name: "Snickers",
    relationship: "Pet",
    pet_type: "Cat",
    gender: "female",
    avatar_url: "https://images.example.com/snickers.jpg",
    avatar_icon: null,
  },
];

test("renders the selected recipient with centralized fallback styling", () => {
  const markup = renderToStaticMarkup(
    <RecipientSelector
      recipients={recipients}
      value="alex"
      onChange={() => undefined}
    />,
  );

  assert.match(markup, />AM</);
  assert.match(markup, /background-color:#D9E9F5/);
  assert.match(markup, /color:#365A72/);
  assert.match(markup, /Alex Morgan/);
  assert.match(markup, /Friend/);
});

test("supports All recipients without creating a fake recipient", () => {
  const markup = renderToStaticMarkup(
    <RecipientSelector
      recipients={recipients}
      value="all"
      onChange={() => undefined}
      allowAll
    />,
  );

  assert.match(markup, /All recipients/);
  assert.match(markup, /Every recipient profile/);
  assert.doesNotMatch(markup, /Alex Morgan/);
});

test("preserves uploaded recipient images and pet relationship details", () => {
  const markup = renderToStaticMarkup(
    <RecipientSelector
      recipients={recipients}
      value="snickers"
      onChange={() => undefined}
    />,
  );

  assert.match(markup, /https:\/\/images\.example\.com\/snickers\.jpg/);
  assert.match(markup, /object-cover object-center/);
  assert.match(markup, /Pet \(Cat\)/);
});
