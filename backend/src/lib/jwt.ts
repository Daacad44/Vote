import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  sub: string;
  role: string;
  stdId: string;
};

const jwtSecret = env.JWT_SECRET;

export function signToken(
  payload: JwtPayload,
  expiresIn: SignOptions["expiresIn"] = "2h",
) {
  return jwt.sign(payload, jwtSecret, { expiresIn });
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret) as JwtPayload & {
    iat: number;
    exp: number;
  };
}
