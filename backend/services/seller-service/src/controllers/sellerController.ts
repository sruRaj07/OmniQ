/**
 * OmniQ seller service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { listSellers, registerSeller, updateSellerStatus, getSellerById, getSellerByOwnerId, updateSellerProfile } from "../services/sellerService";

function extractTokenPayload(request: Request): any {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) throw new Error("Missing authorization token");
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch {
    throw new Error("Invalid token payload");
  }
}

export async function getMySellerProfileController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const seller = await getSellerByOwnerId(payload.sub);
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
    const payload = extractTokenPayload(request);
    const seller = await updateSellerProfile(payload.sub, request.body);
    response.json(ok(seller));
  } catch (error: any) {
    response.status(400).json(fail("SELLER_PROFILE_UPDATE_FAILED", error.message));
  }
}

export async function registerSellerController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const seller = await registerSeller(payload.sub, request.body);
    response.status(201).json(ok(seller));
  } catch (error: any) {
    response.status(400).json(fail("SELLER_REGISTRATION_FAILED", error.message));
  }
}

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
    response.json(ok(seller));
  } catch (error: any) {
    response.status(404).json(fail("SELLER_NOT_FOUND", error.message));
  }
}

export async function updateSellerStatusController(request: Request, response: Response): Promise<void> {
  try {
    const seller = await updateSellerStatus(request.params.id, request.body);
    response.json(ok(seller));
  } catch (error: any) {
    response.status(400).json(fail("SELLER_STATUS_UPDATE_FAILED", error.message));
  }
}
