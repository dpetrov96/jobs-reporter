const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
  extraHeaders?: Record<string, string>
) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function optionsResponse() {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: "",
  };
}
