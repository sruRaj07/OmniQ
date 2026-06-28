/**
 * OmniQ admin service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { getAnalytics, getDashboard, moderateProduct, upsertZone } from "../services/adminService";

export function dashboardController(_request: Request, response: Response): void {
  response.json(ok(getDashboard()));
}

export function analyticsController(_request: Request, response: Response): void {
  response.json(ok(getAnalytics()));
}

export function moderateProductController(request: Request, response: Response): void {
  try {
    response.json(ok(moderateProduct(request.params.id, request.body)));
  } catch {
    response.status(400).json(fail("MODERATION_VALIDATION_FAILED", "Moderation payload is invalid."));
  }
}

export async function zoneController(request: Request, response: Response): Promise<void> {
  try {
    const zone = await upsertZone(request.body);
    response.status(201).json(ok(zone));
  } catch (error: any) {
    response.status(400).json(fail("ZONE_VALIDATION_FAILED", error.message));
  }
}
