export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

export function methodNotAllowed() {
  return json(405, { error: "Method not allowed" });
}

export async function readJson(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw Object.assign(new Error("JSONの形式が正しくありません。"), { statusCode: 400 });
  }
}

export function handleError(error) {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "サーバーでエラーが発生しました。" : error.message;
  return json(statusCode, { error: message });
}
