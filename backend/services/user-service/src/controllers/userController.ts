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
import { deleteUserAccount } from "../../../../shared/utils/accountDeletion";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";
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

/**
 * DELETE /users/me - the account deletion path Google Play requires.
 *
 * The account deleted is always the one in the gateway-verified token; there is no user id in the
 * body or the path, so this cannot be pointed at somebody else's account. Deletion is immediate and
 * irreversible, so the client must echo a confirmation string - a stray DELETE from a retry or a
 * mis-wired button should not erase an account.
 *
 * `apiClient` retries network errors and 5xx twice. That is safe here: deleting an already-deleted
 * account finds no rows and no auth user, and the second attempt fails at the auth step rather than
 * damaging anything. It is never a partial re-run of a successful deletion.
 */
export async function deleteAccountController(request: Request, response: Response): Promise<void> {
  try {
    const userId = requireUserId(request);

    if (request.body?.confirm !== "DELETE") {
      response.status(400).json(fail("CONFIRMATION_REQUIRED", 'Send {"confirm":"DELETE"} to permanently delete this account.'));
      return;
    }

    const result = await deleteUserAccount(supabaseAdmin, userId, "self_service");
    response.json(ok({
      deleted: true,
      ordersAnonymised: result.ordersAnonymised,
      completedAt: result.completedAt,
      retained: "Order records are kept for tax and accounting purposes with all identifying details removed."
    }));
  } catch (error: any) {
    // Never a 200 on a failed deletion. The previous admin path logged the error and reported
    // success, which told people their account was gone while it was still live.
    response.status(500).json(fail("ACCOUNT_DELETION_FAILED", error.message));
  }
}
