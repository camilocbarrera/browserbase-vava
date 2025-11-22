import { generateExtractionCode } from "@/lib/llm-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, responseData, url, dom } = body;

    if (!prompt || !responseData || !url) {
      return NextResponse.json(
        { error: "prompt, responseData, and url are required" },
        { status: 400 }
      );
    }

    const mainResponse = Array.isArray(responseData)
      ? responseData.find((r: any) => r.status === 200) || responseData[0]
      : responseData.status === 200
      ? responseData
      : responseData;

    const result = await generateExtractionCode(prompt, mainResponse, url, dom);

    return NextResponse.json({
      code: result.code,
      explanation: result.explanation,
    });
  } catch (error) {
    console.error("Extract API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

