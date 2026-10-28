import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchRecipientSavedCounts,
  filterAndSortRecipients,
  recipientOccasions,
  type OverviewRecipient,
  type RecipientOccasion,
} from "./recipientOverview";

const recipient = (
  overrides: Partial<OverviewRecipient> = {},
): OverviewRecipient => ({
  id: "a",
  name: "Alex",
  relationship: "Friend",
  pet_type: null,
  notes: null,
  birthday: null,
  annual_budget: null,
  gift_budget_min: null,
  gift_budget_max: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  ...overrides,
});
const event = (
  overrides: Partial<RecipientOccasion> = {},
): RecipientOccasion => ({
  id: "event",
  recipient_id: "a",
  label: "Anniversary",
  event_date: "2020-10-31",
  event_type: "anniversary",
  occurs_every_year: true,
  ...overrides,
});
const today = new Date(2026, 9, 28, 12);

test("recipient occasions reuse annual recurrence, include today, omit past one-offs and unrelated events", () => {
  const rows = recipientOccasions(
    [recipient({ birthday: "1990-10-28" })],
    [
      event(),
      event({ id: "past", occurs_every_year: false }),
      event({ id: "other", recipient_id: "someone-else" }),
      event({ id: "invalid", event_date: "2026-02-31" }),
    ],
    today,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].label, "Birthday");
  assert.equal(rows[0].date.getDate(), 28);
  assert.equal(rows[1].date.getFullYear(), 2026);
  const nextYear = recipientOccasions(
    [recipient({ birthday: "1990-10-20" })],
    [],
    today,
  );
  assert.equal(nextYear[0].date.getFullYear(), 2027);
});

test("recipient occasions preserve distinct labels and omit empty profiles", () => {
  const rows = recipientOccasions(
    [recipient({ birthday: "1990-10-31" })],
    [
      event({ label: "Alex birthday", event_type: "birthday" }),
      event({
        id: "later",
        event_date: "2026-12-01",
        occurs_every_year: false,
      }),
    ],
    today,
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(recipientOccasions([recipient()], [], today), []);
});

test("search keeps name, relationship and pet matching; all sort options are real and do not mutate input", () => {
  const rows = [
    recipient({
      id: "b",
      name: "Zoe",
      updated_at: "2026-10-01",
      birthday: "2000-10-30",
    }),
    recipient({
      name: "Alex",
      created_at: "2026-06-01",
      relationship: "Pet",
      pet_type: "Cat",
    }),
  ];
  const occasions = recipientOccasions(rows, [], today);
  assert.deepEqual(
    filterAndSortRecipients(rows, " CAT ", "newest", occasions).map(
      (r) => r.id,
    ),
    ["a"],
  );
  assert.deepEqual(
    filterAndSortRecipients(rows, "friend", "newest", occasions).map(
      (r) => r.id,
    ),
    ["b"],
  );
  assert.deepEqual(
    filterAndSortRecipients(rows, "", "name", occasions).map((r) => r.id),
    ["a", "b"],
  );
  assert.deepEqual(
    filterAndSortRecipients(rows, "", "newest", occasions).map((r) => r.id),
    ["a", "b"],
  );
  assert.deepEqual(
    filterAndSortRecipients(rows, "", "updated", occasions).map((r) => r.id),
    ["b", "a"],
  );
  assert.deepEqual(
    filterAndSortRecipients(rows, "", "occasion", occasions).map((r) => r.id),
    ["b", "a"],
  );
  assert.deepEqual(
    filterAndSortRecipients(rows, "unmatched", "name", occasions),
    [],
  );
  assert.deepEqual(
    rows.map((r) => r.id),
    ["b", "a"],
  );
});

test("saved counts paginate once per page, scope to user, and never fetch product snapshots", async () => {
  const calls: unknown[][] = [];
  const client = {
    from(table: string) {
      assert.equal(table, "recipient_saved_gift_ideas");
      const query = {
        select(value: string) {
          assert.equal(value, "id, recipient_id");
          return query;
        },
        eq(key: string, value: string) {
          assert.deepEqual([key, value], ["user_id", "user"]);
          return query;
        },
        order(key: string) {
          assert.equal(key, "id");
          return query;
        },
        range(start: number, end: number) {
          calls.push([start, end]);
          return Promise.resolve({
            error: null,
            data:
              start === 0
                ? Array.from({ length: 1000 }, (_, i) => ({
                    id: String(i),
                    recipient_id: "a",
                  }))
                : [{ id: "last", recipient_id: "b" }],
          });
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  assert.deepEqual(await fetchRecipientSavedCounts(client, "user"), {
    a: 1000,
    b: 1,
  });
  assert.deepEqual(calls, [
    [0, 999],
    [1000, 1999],
  ]);
  await assert.rejects(
    fetchRecipientSavedCounts(client, ""),
    /user is required/,
  );
});

test("saved count failures are not reported as zero", async () => {
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    order() {
      return query;
    },
    range() {
      return Promise.resolve({ data: null, error: { message: "denied" } });
    },
  };
  const client = { from: () => query } as unknown as SupabaseClient;
  await assert.rejects(
    fetchRecipientSavedCounts(client, "user"),
    /Unable to load/,
  );
});
