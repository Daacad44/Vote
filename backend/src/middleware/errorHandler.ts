import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  const message =
    status >= 500 ? "Internal server error" : err.message || "Request failed";

  console.error("[error]", err);

  res.status(status).json({ message });
}
