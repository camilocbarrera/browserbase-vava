import { browserbaseService } from "@/lib/browserbase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, url } = body;

    if (!code || !url) {
      return NextResponse.json(
        { error: "code and url are required" },
        { status: 400 }
      );
    }

    const page = await browserbaseService.navigateToUrl(url);
    const result = await browserbaseService.executeCode(page, code);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Execute API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

