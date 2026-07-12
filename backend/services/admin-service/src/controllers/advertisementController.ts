import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";

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

export async function deleteAdvertisementController(request: Request, response: Response): Promise<void> {
  try {
    const id = request.params.id;
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

    const { data, error } = await supabaseAdmin
      .from("advertisements")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    response.json(ok(data));
  } catch (error: any) {
    console.error("ADVERTISEMENT UPDATE ERROR:", error);
    response.status(500).json(fail("SERVER_ERROR", error.message || error.toString()));
  }
}
