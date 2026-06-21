export default function responseWrapper(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (body && typeof body === "object" && !("success" in body)) {
      body = { success: true, ...body };
    }
    return originalJson(body);
  };
  next();
}
