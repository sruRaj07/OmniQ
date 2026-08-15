/**
 * OmniQ user service - HTTP controllers.
 * Author: OmniQ Team
 *
 * Identity comes from the gateway-verified headers on request.omniqUser (see
 * shared/utils/gatewayIdentity). These controllers previously base64-decoded the JWT payload
 * themselves, with a comment claiming "the API Gateway already validates the signature" - which
 * it did not. Anyone could mint an unsigned JWT with an arbitrary `sub` and act as that user.
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { requireUserId } from "../../../../shared/utils/gatewayIdentity";
import { assignRole, getCurrentProfile, updateProfile, createUserRequest, getUserRequests } from "../services/userService";

export async function meController(request: Request, response: Response): Promise<void> {
  try {
    const profile = await getCurrentProfile(requireUserId(request), request.omniqUser?.email);
    response.json(ok(profile));
  } catch (error: any) {
    response.status(404).json(fail("PROFILE_NOT_FOUND", error.message));
  }
}

export async function updateProfileController(request: Request, response: Response): Promise<void> {
  try {
    const profile = await updateProfile(requireUserId(request), request.body);
    response.json(ok(profile));
  } catch (error: any) {
    response.status(400).json(fail("PROFILE_UPDATE_FAILED", error.message));
  }
}

/**
 * Admin-only. The previous version read the caller's own id from the token and applied
 * `request.body.role` to it, so any signed-in user could POST {"role":"admin"} and promote
 * themselves. The target is now taken from the validated body and the route is role-guarded.
 */
export async function assignRoleController(request: Request, response: Response): Promise<void> {
  try {
    const profile = await assignRole(request.body);
    response.json(ok(profile));
  } catch (error: any) {
    response.status(400).json(fail("ROLE_ASSIGNMENT_FAILED", error.message));
  }
}

export async function createUserRequestController(request: Request, response: Response): Promise<void> {
  try {
    const { type, reason } = request.body;
    const result = await createUserRequest(requireUserId(request), type, reason);
    response.status(201).json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("REQUEST_FAILED", error.message));
  }
}

export async function getUserRequestsController(request: Request, response: Response): Promise<void> {
  try {
    const requests = await getUserRequests(requireUserId(request));
    response.json(ok(requests));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_REQUESTS_FAILED", error.message));
  }
}
