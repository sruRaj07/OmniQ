/**
 * OmniQ location service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import {
  checkZone,
  lookupPincode,
  calculateDelivery,
  autocompletePlaces,
  getPlaceDetails,
  reverseGeocodeCoords,
} from "../services/locationService";
import {
  autocompleteQuerySchema,
  placeDetailsQuerySchema,
  reverseGeocodeQuerySchema,
} from "../validators/locationValidator";

export async function zoneCheckController(request: Request, response: Response): Promise<void> {
  try {
    const result = await checkZone(request.body);
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("ZONE_CHECK_VALIDATION_FAILED", error.message));
  }
}

export async function calculateDeliveryController(request: Request, response: Response): Promise<void> {
  try {
    const result = await calculateDelivery(request.body);
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("CALCULATE_DELIVERY_FAILED", error.message));
  }
}

export async function pincodeLookupController(request: Request, response: Response): Promise<void> {
  try {
    const result = await lookupPincode(request.params.pincode);
    if (!result) {
      response.status(404).json(fail("PINCODE_NOT_FOUND", "No locality found for this pincode."));
      return;
    }
    response.json(ok(result));
  } catch (error: any) {
    // A bad pincode is the caller's fault; an upstream/network failure is ours. Distinguish the
    // two so the app can stay silent on 502 instead of telling the buyer their pincode is wrong.
    const isValidationError = error?.name === "ZodError";
    const status = isValidationError ? 400 : 502;
    const code = isValidationError ? "PINCODE_VALIDATION_FAILED" : "PINCODE_LOOKUP_UNAVAILABLE";
    const message = isValidationError
      ? "Pincode must be 6 digits and cannot start with 0"
      : "Pincode directory is unavailable right now.";
    response.status(status).json(fail(code, message));
  }
}

export async function placesAutocompleteController(request: Request, response: Response): Promise<void> {
  try {
    const parsed = autocompleteQuerySchema.parse({
      input: request.query.input,
      sessionToken: request.query.sessionToken,
    });
    const results = await autocompletePlaces(parsed.input, parsed.sessionToken);
    response.json(ok(results));
  } catch (error: any) {
    response.status(400).json(fail("AUTOCOMPLETE_FAILED", error.message));
  }
}

export async function placeDetailsController(request: Request, response: Response): Promise<void> {
  try {
    const parsed = placeDetailsQuerySchema.parse({
      placeId: request.query.placeId,
      sessionToken: request.query.sessionToken,
    });
    const result = await getPlaceDetails(parsed.placeId, parsed.sessionToken);
    if (!result) {
      response.status(404).json(fail("PLACE_NOT_FOUND", "Could not fetch details for this location."));
      return;
    }
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("PLACE_DETAILS_FAILED", error.message));
  }
}

export async function reverseGeocodeController(request: Request, response: Response): Promise<void> {
  try {
    const parsed = reverseGeocodeQuerySchema.parse({
      lat: request.query.lat,
      lng: request.query.lng,
    });
    const result = await reverseGeocodeCoords(parsed.lat, parsed.lng);
    if (!result) {
      response.status(404).json(fail("GEOCODE_NOT_FOUND", "Could not reverse geocode these coordinates."));
      return;
    }
    response.json(ok(result));
  } catch (error: any) {
    response.status(400).json(fail("GEOCODE_FAILED", error.message));
  }
}

