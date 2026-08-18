import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

/**
 * Every campaign, live or paused.
 *
 * The console previously read the buyer-facing `GET /products/advertisements`, which filters to
 * `is_active = true`. Pausing a campaign therefore removed it from the only screen that could
 * resume it - the pause button was a one-way door and the "(Paused)" label and resume button in
 * the UI were unreachable code. The storefront endpoint is deliberately left exactly as it is;
 * this is an additive admin-only read.
 */
export async function listAdvertisementsController(request: Request, response: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from("advertisements")
      .select("id, title, image_url, target_url, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(ADVERTISEMENT_LIST_LIMIT);

    if (error) {
      throw new Error(`Failed to fetch advertisements: ${error.message}`);
    }

    response.json(ok(data ?? []));
  } catch (error: any) {
    console.error("ADVERTISEMENT LIST ERROR:", error);
    response.status(500).json(fail("SERVER_ERROR", error.message || error.toString()));
  }
}

/**
 * Explicit ceiling. A `.select()` with no range is silently capped by PostgREST at `db.max_rows`,
 * which is a truncation the caller cannot detect. Campaign counts are small; stating the bound
 * means the number of rows returned is a decision rather than an accident.
 */
const ADVERTISEMENT_LIST_LIMIT = 200;

export async function createAdvertisementController(request: Request, response: Response): Promise<void> {
  try {
    const title = request.body.title as string;
    const targetUrl = request.body.target_url as string || "";

    if (!title) {
      response.status(400).json(fail("VALIDATION_ERROR", "Title is required."));
      return;
    }

    const file = request.file;
    if (!file) {
      response.status(400).json(fail("VALIDATION_ERROR", "Advertisement image is required."));
      return;
    }

    // Upload to Supabase Storage
    const fileName = `ads/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(fileName);
      
    const imageUrl = publicUrlData.publicUrl;

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from("advertisements")
      .insert({
        title,
        image_url: imageUrl,
        target_url: targetUrl,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    response.status(201).json(ok(data));
  } catch (error: any) {
    console.error("ADVERTISEMENT CREATE ERROR:", error);
    response.status(500).json(fail("SERVER_ERROR", error.message || error.toString()));
  }
}

/**
 * `advertisements.id` is a uuid column, so a malformed id reached Postgres and came back as
 * `invalid input syntax for type uuid: "..."` under a 500 - a client mistake reported as a server
 * fault. Checking the shape first makes it a 400, which is what DELETE /admin/zones/:id already did.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rejectMalformedId(id: string | undefined, response: Response): boolean {
  if (id && UUID_PATTERN.test(id)) return false;
  response.status(400).json(fail("VALIDATION_ERROR", "Advertisement id must be a valid uuid."));
  return true;
}

export async function deleteAdvertisementController(request: Request, response: Response): Promise<void> {
  try {
    const id = request.params.id;
    if (rejectMalformedId(id, response)) return;
    const { error } = await supabaseAdmin
      .from("advertisements")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Database delete failed: ${error.message}`);
    }

    response.json(ok({ deleted: true }));
  } catch (error: any) {
    console.error("ADVERTISEMENT DELETE ERROR:", error);
    response.status(500).json(fail("SERVER_ERROR", error.message || error.toString()));
  }
}

export async function updateAdvertisementController(request: Request, response: Response): Promise<void> {
  try {
    const id = request.params.id;
    if (rejectMalformedId(id, response)) return;
    const { title, target_url, is_active } = request.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (target_url !== undefined) updates.target_url = target_url;
    
    // is_active might be sent as string "true"/"false" or boolean
    if (is_active !== undefined) {
      updates.is_active = is_active === true || is_active === "true";
    }

    const file = request.file;
    if (file) {
      const fileName = `ads/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(fileName);
        
      updates.image_url = publicUrlData.publicUrl;
    }

    // An empty patch is a client bug, not a database error: PostgREST rejects `update({})` with a
    // generic 400 that surfaced to the operator as "Database update failed".
    if (Object.keys(updates).length === 0) {
      response.status(400).json(fail("VALIDATION_ERROR", "Nothing to update."));
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("advertisements")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    // maybeSingle rather than single: a campaign deleted in another tab used to come back as a
    // 500 "JSON object requested, multiple (or no) rows returned", which tells the operator nothing.
    if (!data) {
      response.status(404).json(fail("NOT_FOUND", "That campaign no longer exists."));
      return;
    }

    response.json(ok(data));
  } catch (error: any) {
    console.error("ADVERTISEMENT UPDATE ERROR:", error);
    response.status(500).json(fail("SERVER_ERROR", error.message || error.toString()));
  }
}
