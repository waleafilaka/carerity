import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  const GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_API_KEY;
  
  export async function GET(
    request: NextRequest
  ) {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json(
          {
            error:
              "Google Maps is not configured.",
          },
          { status: 500 }
        );
      }
  
      const input =
        request.nextUrl.searchParams
          .get("input")
          ?.trim();
  
      const sessionToken =
        request.nextUrl.searchParams
          .get("sessionToken")
          ?.trim();
  
      if (!input || input.length < 3) {
        return NextResponse.json({
          suggestions: [],
        });
      }
  
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "X-Goog-Api-Key":
              GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
          },
          body: JSON.stringify({
            input,
            includedRegionCodes: [
              "ca",
            ],
            languageCode: "en",
            regionCode: "CA",
            ...(sessionToken
              ? { sessionToken }
              : {}),
          }),
          cache: "no-store",
        }
      );
  
      const data =
        await response.json();
  
      if (!response.ok) {
        console.error(
          "Google autocomplete error:",
          data
        );
  
        return NextResponse.json(
          {
            error:
              "Unable to search addresses.",
          },
          { status: response.status }
        );
      }
  
      const suggestions = (
        data.suggestions || []
      )
        .map((item: any) => {
          const prediction =
            item.placePrediction;
  
          if (!prediction?.placeId) {
            return null;
          }
  
          return {
            placeId:
              prediction.placeId,
            text:
              prediction.text?.text ||
              "",
            mainText:
              prediction
                .structuredFormat
                ?.mainText?.text ||
              "",
            secondaryText:
              prediction
                .structuredFormat
                ?.secondaryText
                ?.text || "",
          };
        })
        .filter(Boolean);
  
      return NextResponse.json({
        suggestions,
      });
    } catch (error) {
      console.error(
        "Places autocomplete route error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Unable to search addresses.",
        },
        { status: 500 }
      );
    }
  }
  