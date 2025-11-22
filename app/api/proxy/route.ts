import { browserbaseService } from "@/lib/browserbase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "URL parameter required" },
      { status: 400 }
    );
  }

  try {
    const result = await browserbaseService.makeRequest(targetUrl);

    return NextResponse.json({
      data: result.data,
      status: result.status,
      dom: result.dom,
      networkRequests: result.networkRequests,
      networkResponses: result.networkResponses,
      networkFailed: result.networkFailed,
      sessionStatus: browserbaseService.getSessionStatus(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

