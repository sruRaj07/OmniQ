/**
 * OmniQ admin service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { getAnalytics, getDashboard, moderateProduct, upsertZone, deleteZone, listZones, listAllOrders, listUserRequests, actionUserRequest } from "../services/adminService";

export async function dashboardController(_request: Request, response: Response): Promise<void> {
  try {
    const data = await getDashboard();
    response.json(ok(data));
  } catch (error: any) {
    response.status(500).json(fail("DASHBOARD_ERROR", error.message));
  }
}

export function analyticsController(_request: Request, response: Response): void {
  response.json(ok(getAnalytics()));
}

export async function moderateProductController(request: Request, response: Response): Promise<void> {
  try {
    const result = await moderateProduct(request.params.id, request.body);
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("MODERATION_FAILED", error.message || "Moderation payload is invalid."));
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

export async function deleteZoneController(request: Request, response: Response): Promise<void> {
  try {
    const result = await deleteZone(request.params.id);
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("ZONE_DELETE_FAILED", error.message));
  }
}

export async function listZonesController(_request: Request, response: Response): Promise<void> {
  try {
    const zones = await listZones();
    response.json(ok(zones));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_ZONES_FAILED", error.message));
  }
}

export async function listAllOrdersController(_request: Request, response: Response): Promise<void> {
  try {
    const orders = await listAllOrders();
    response.json(ok(orders));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_ALL_ORDERS_FAILED", error.message));
  }
}

export async function listUserRequestsController(request: Request, response: Response): Promise<void> {
  try {
    const status = request.query.status as string | undefined;
    const requests = await listUserRequests(status);
    response.json(ok(requests));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_USER_REQUESTS_FAILED", error.message));
  }
}

export async function actionUserRequestController(request: Request, response: Response): Promise<void> {
  try {
    const { id } = request.params;
    const { status, adminNotes } = request.body;
    const result = await actionUserRequest(id, status, adminNotes);
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("ACTION_REQUEST_FAILED", error.message));
  }
}
