/**
 * OmniQ seller service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { listSellers, registerSeller, updateSellerStatus, getSellerById } from "../services/sellerService";

export async function registerSellerController(request: Request, response: Response): Promise<void> {
  try {
    const ownerId = "d00d0000-0000-0000-0000-000000000000"; // Hardcoded for testing
    const seller = await registerSeller(ownerId, request.body);
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
