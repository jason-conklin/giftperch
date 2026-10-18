import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDashboardStats } from "./dashboardStats";

type QueryCall = {
  table: string;
  column: string;
  options: { count: string; head: boolean };
  filters: Array<[string, unknown]>;
};

type MockResult = {
  count: number | null;
  error: { message: string } | null;
};

function createCountClient(results: Record<string, MockResult>) {
  const calls: QueryCall[] = [];

  const client = {
    from(table: string) {
      const call: QueryCall = {
        table,
        column: "",
        options: { count: "", head: false },
        filters: [],
      };
      calls.push(call);

      const query = {
        select(column: string, options: { count: string; head: boolean }) {
          call.column = column;
          call.options = options;
          return query;
        },
        eq(column: string, value: unknown) {
          call.filters.push([column, value]);
          return query;
        },
        then(
          resolve: (result: MockResult) => unknown,
          reject: (reason: unknown) => unknown,
        ) {
          return Promise.resolve(
            results[table] ?? { count: null, error: { message: "missing mock" } },
          ).then(resolve, reject);
        },
      };

      return query;
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

test("returns exact user-scoped dashboard counts", async () => {
  const { client, calls } = createCountClient({
    recipient_profiles: { count: 4, error: null },
    recipient_saved_gift_ideas: { count: 14, error: null },
    gift_suggestions: { count: 7, error: null },
  });

  const stats = await fetchDashboardStats(client, "user-123");

  assert.deepEqual(stats, {
    recipientCount: 4,
    savedGiftCount: 14,
    suggestionRunCount: 7,
  });
  assert.deepEqual(
    calls.map(({ table, column, options }) => ({ table, column, options })),
    [
      {
        table: "recipient_profiles",
        column: "id",
        options: { count: "exact", head: true },
      },
      {
        table: "recipient_saved_gift_ideas",
        column: "id",
        options: { count: "exact", head: true },
      },
      {
        table: "gift_suggestions",
        column: "id",
        options: { count: "exact", head: true },
      },
    ],
  );
  for (const call of calls) {
    assert.ok(
      call.filters.some(
        ([column, value]) => column === "user_id" && value === "user-123",
      ),
      `${call.table} must be scoped to the authenticated user`,
    );
  }
  assert.ok(
    calls[0].filters.some(
      ([column, value]) => column === "is_self" && value === false,
    ),
  );
});

test("returns legitimate zero counts for a user with no data", async () => {
  const { client } = createCountClient({
    recipient_profiles: { count: 0, error: null },
    recipient_saved_gift_ideas: { count: 0, error: null },
    gift_suggestions: { count: 0, error: null },
  });

  assert.deepEqual(await fetchDashboardStats(client, "empty-user"), {
    recipientCount: 0,
    savedGiftCount: 0,
    suggestionRunCount: 0,
  });
});

test("surfaces query failures instead of converting them to zero", async () => {
  const { client } = createCountClient({
    recipient_profiles: { count: 3, error: null },
    recipient_saved_gift_ideas: {
      count: null,
      error: { message: "permission denied" },
    },
    gift_suggestions: { count: 2, error: null },
  });

  await assert.rejects(
    fetchDashboardStats(client, "user-123"),
    /Unable to load saved gift count: permission denied/,
  );
});

test("rejects missing users before issuing any queries", async () => {
  const { client, calls } = createCountClient({});

  await assert.rejects(
    fetchDashboardStats(client, ""),
    /without a user/,
  );
  assert.equal(calls.length, 0);
});
