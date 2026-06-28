/**
 * OmniQ location service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { checkZone } from "../services/locationService";

export async function zoneCheckController(request: Request, response: Response): Promise<void> {
  try {
    const result = await checkZone(request.body);
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("ZONE_CHECK_VALIDATION_FAILED", error.message));
  }
}
