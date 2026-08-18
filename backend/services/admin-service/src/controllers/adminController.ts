/**
 * OmniQ admin service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { getAnalytics, getDashboard, moderateProduct, upsertZone, deleteZone, listZones, listAllOrders, listUserRequests, actionUserRequest, listFlaggedProducts, listAuditLog } from "../services/adminService";

export async function dashboardController(request: Request, response: Response): Promise<void> {
  try {
    const fresh = request.query.fresh === "1" || request.query.fresh === "true";
    const data = await getDashboard({ fresh });
    response.json(ok(data, { generatedAt: data.generatedAt, cached: !fresh }));
  } catch (error: any) {
    response.status(500).json(fail("DASHBOARD_ERROR", error.message));
  }
}

export async function analyticsController(_request: Request, response: Response): Promise<void> {
  try {
    // This was declared non-async and did `ok(getAnalytics())`, so it serialised a pending Promise.
    // The client received `{"success":true,"data":{}}` on every call - an empty object, never the
    // analytics - and had no error to react to.
    const data = await getAnalytics();
    response.json(ok(data, { generatedAt: data.generatedAt }));
  } catch (error: any) {
    response.status(500).json(fail("ANALYTICS_ERROR", error.message));
  }
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

export async function listAllOrdersController(request: Request, response: Response): Promise<void> {
  try {
    const { rows, total, limit, offset, hasMore } = await listAllOrders({
      limit: request.query.limit ? Number(request.query.limit) : undefined,
      offset: request.query.offset ? Number(request.query.offset) : undefined,
      status: request.query.status as string | undefined,
      search: request.query.search as string | undefined
    });
    // The page stays in `data` and the paging figures go in `meta`, so a client reading
    // `response.data.data` still gets an array of orders - the response shape is unchanged.
    response.json(ok(rows, { total, limit, offset, hasMore }));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_ALL_ORDERS_FAILED", error.message));
  }
}

export async function listFlaggedProductsController(request: Request, response: Response): Promise<void> {
  try {
    const { rows, total } = await listFlaggedProducts(request.query.limit ? Number(request.query.limit) : undefined);
    response.json(ok(rows, { total }));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_FLAGGED_FAILED", error.message));
  }
}

export async function listAuditLogController(request: Request, response: Response): Promise<void> {
  try {
    const { rows, total } = await listAuditLog(request.query.limit ? Number(request.query.limit) : undefined);
    response.json(ok(rows, { total }));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_AUDIT_LOG_FAILED", error.message));
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
