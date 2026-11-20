import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";
import { forbidden } from "../utils/httpError";

// Sperrt eine Route, wenn das aktuelle Paket (Plan) das Feature nicht enthält.
// Ohne Subscription (z.B. Trial/Default) werden alle Features erlaubt, damit
// die App lokal/ohne Billing-Setup voll nutzbar bleibt.
export function requireFeature(featureKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: req.auth!.companyId },
      include: { plan: true },
    });
    if (!subscription) return next();

    const features: string[] = JSON.parse(subscription.plan.featuresJson);
    if (!features.includes(featureKey)) {
      return next(forbidden(`Feature "${featureKey}" ist in deinem Paket (${subscription.plan.name}) nicht enthalten.`));
    }
    next();
  };
}
