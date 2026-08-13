/**
 * OmniQ user service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { assignRole, getCurrentProfile, updateProfile, createUserRequest, getUserRequests } from "../services/userService";

/**
 * Extracts the user ID from the JWT token passed by the API Gateway.
 * The API Gateway already validates the signature, so we just decode the payload.
 */
function extractTokenPayload(request: Request): any {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) throw new Error("Missing authorization token");
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  if (!payload.sub) throw new Error("Invalid token payload");
  return payload;
}

export async function meController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const profile = await getCurrentProfile(payload.sub, payload);
    response.json(ok(profile));
  } catch (error: any) {
    response.status(404).json(fail("PROFILE_NOT_FOUND", error.message));
  }
}

export async function updateProfileController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const profile = await updateProfile(payload.sub, request.body);
    response.json(ok(profile));
  } catch (error: any) {
    response.status(400).json(fail("PROFILE_UPDATE_FAILED", error.message));
  }
}

export async function assignRoleController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const profile = await assignRole(payload.sub, request.body);
    response.json(ok(profile));
  } catch (error: any) {
    response.status(400).json(fail("ROLE_ASSIGNMENT_FAILED", error.message));
  }
}

export async function createUserRequestController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const { type, reason } = request.body;
    const result = await createUserRequest(payload.sub, type, reason);
    response.status(201).json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("REQUEST_FAILED", error.message));
  }
}

export async function getUserRequestsController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const requests = await getUserRequests(payload.sub);
    response.json(ok(requests));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_REQUESTS_FAILED", error.message));
  }
}
