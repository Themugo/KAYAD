import { onJsonResponse } from "../utils/responseHooks.js";

export default function responseWrapper(req, res, next) {
  onJsonResponse(res, (body) => {
    if (body && typeof body === "object" && !Array.isArray(body) && !("success" in body)) {
      return { success: true, ...body };
    }
    return body;
  });
  next();
}
