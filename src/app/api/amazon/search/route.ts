import { NextResponse } from "next/server";
import {
  searchAmazonProducts,
  type AmazonProduct,
} from "@/lib/amazonPaapi";

type SearchBody = {
  query?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  maxResults?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json(
        { error: "Query is required", products: [] as AmazonProduct[] },
        { status: 400 },
      );
    }

    const products = await searchAmazonProducts({
      query,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
      maxResults: body.maxResults ?? undefined,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Amazon search failed", error);
    return NextResponse.json(
      { error: "Amazon search failed", products: [] },
      { status: 500 },
    );
  }
}
