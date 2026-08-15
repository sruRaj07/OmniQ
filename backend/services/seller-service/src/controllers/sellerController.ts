/**
 * OmniQ seller service - HTTP controllers.
 * Author: OmniQ Team
 *
 * Identity comes from the gateway-verified headers on request.omniqUser (see
 * shared/utils/gatewayIdentity). These controllers previously base64-decoded the JWT payload
 * without any signature check, so `sub` could be set to any user id by the caller.
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { requireUserId } from "../../../../shared/utils/gatewayIdentity";
import { listSellers, registerSeller, updateSellerStatus, getSellerById, getSellerByOwnerId, updateSellerProfile } from "../services/sellerService";

export async function getMySellerProfileController(request: Request, response: Response): Promise<void> {
  try {
    const seller = await getSellerByOwnerId(requireUserId(request));
    if (!seller) {
      response.status(404).json(fail("SELLER_NOT_FOUND", "No seller profile found for this user"));
      return;
    }
    response.json(ok(seller));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_SELLER_FAILED", error.message));
  }
}

export async function updateMySellerProfileController(request: Request, response: Response): Promise<void> {
  try {
    const seller = await updateSellerProfile(requireUserId(request), request.body);
    response.json(ok(seller));
  } catch (error: any) {
    response.status(400).json(fail("SELLER_PROFILE_UPDATE_FAILED", error.message));
  }
}

export async function registerSellerController(request: Request, response: Response): Promise<void> {
  try {
    const seller = await registerSeller(requireUserId(request), request.body);
    response.status(201).json(ok(seller));
  } catch (error: any) {
    response.status(400).json(fail("SELLER_REGISTRATION_FAILED", error.message));
  }
}

/** Admin console listing. Returns full seller rows including GST - see the guard in server.ts. */
export async function listSellersController(_request: Request, response: Response): Promise<void> {
  try {
    const sellers = await listSellers();
    response.json(ok(sellers));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_SELLERS_FAILED", error.message));
  }
}

export async function getSellerByIdController(request: Request, response: Response): Promise<void> {
  try {
    const seller = await getSellerById(request.params.id);
    if (!seller) {
      response.status(404).json(fail("SELLER_NOT_FOUND", "The requested seller does not exist."));
      return;
    }
    response.json(ok(seller));
  } catch (error: any) {
    response.status(404).json(fail("SELLER_NOT_FOUND", error.message));
  }
}

/**
 * Admin-only. Approving or rejecting a seller decides who may list products and receive orders;
 * this route previously had no authorisation whatsoever, so any caller could approve themselves.
 * The route is wrapped in requireRole("admin") - see server.ts.
 */
export async function updateSellerStatusController(request: Request, response: Response): Promise<void> {
  try {
    const seller = await updateSellerStatus(request.params.id, request.body);
    response.json(ok(seller));
  } catch (error: any) {
    response.status(400).json(fail("SELLER_STATUS_UPDATE_FAILED", error.message));
  }
}
