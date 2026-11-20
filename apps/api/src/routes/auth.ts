import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma";
import { env } from "../env";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, unauthorized } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw badRequest("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const company = await prisma.company.create({
      data: { name: data.companyName },
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: toUserDTO(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw unauthorized("Invalid credentials");

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw unauthorized("Invalid credentials");

    const token = signToken(user);
    res.json({ token, user: toUserDTO(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
    });
    res.json(toUserDTO(user));
  })
);

function signToken(user: { id: string; companyId: string; role: string }) {
  return jwt.sign(
    { userId: user.id, companyId: user.companyId, role: user.role },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

function toUserDTO(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
  };
}
