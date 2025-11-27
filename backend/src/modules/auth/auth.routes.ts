import { Router } from "express";
import { authLimiter, otpLimiter } from "../../middleware/rateLimiters";
import {
  login,
  register,
  resendOtp,
  verifyOtpCode,
} from "./auth.controller";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/otp/resend", otpLimiter, resendOtp);
router.post("/otp/verify", otpLimiter, verifyOtpCode);

export const authRoutes = router;
