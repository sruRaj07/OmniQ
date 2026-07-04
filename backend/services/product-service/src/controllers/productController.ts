/**
 * OmniQ product service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { createProduct, getProduct, listProducts, listSellerProducts } from "../services/productService";

export async function listProductsController(request: Request, response: Response): Promise<void> {
  try {
    const sellerId = request.query.sellerId as string | undefined;
    const products = await listProducts(sellerId);
    response.json(ok(products, { page: 1, limit: 20, total: products.length }));
  } catch (error: any) {
    response.status(500).json(fail("SERVER_ERROR", error.message));
  }
}

export async function listSellerProductsController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const ownerId = payload?.sub;
    if (!ownerId) {
      response.status(401).json(fail("UNAUTHORIZED", "Missing token"));
      return;
    }
    const products = await listSellerProducts(ownerId);
    response.json(ok(products, { page: 1, limit: products.length, total: products.length }));
  } catch (error: any) {
    response.status(500).json(fail("SERVER_ERROR", error.message));
  }
}

export async function getProductController(request: Request, response: Response): Promise<void> {
  try {
    const product = await getProduct(request.params.id);
    if (!product) {
      response.status(404).json(fail("PRODUCT_NOT_FOUND", "The requested product does not exist."));
      return;
    }
    response.json(ok(product));
  } catch (error: any) {
    response.status(500).json(fail("SERVER_ERROR", error.message));
  }
}

import { supabase, supabaseAdmin } from "../../../../shared/utils/supabaseClient";

function extractTokenPayload(request: Request): any {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload;
  } catch {
    return null;
  }
}

export async function createProductController(request: Request, response: Response): Promise<void> {
  try {
    // Sanitize form-data keys and values to fix hidden space issues in Postman
    const sanitizedBody: any = {};
    for (const key in request.body) {
      if (Object.prototype.hasOwnProperty.call(request.body, key)) {
        sanitizedBody[key.trim()] = typeof request.body[key] === 'string' ? request.body[key].trim() : request.body[key];
      }
    }
    request.body = sanitizedBody;

    const files = request.files as Express.Multer.File[] | undefined;
    const imageUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error } = await supabaseAdmin.storage.from("product-images").upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });
        if (error) throw new Error(`Image upload failed: ${error.message}`);
        
        const { data: publicUrlData } = supabaseAdmin.storage.from("product-images").getPublicUrl(fileName);
        imageUrls.push(publicUrlData.publicUrl);
      }
    }

    // Merge uploaded urls into the request body
    if (imageUrls.length > 0) {
      request.body.images = imageUrls;
    } else if (typeof request.body.images === 'string') {
      // Sometimes form-data sends a single array element as a string
      request.body.images = [request.body.images];
    }

    const payload = extractTokenPayload(request);
    const authUserId = payload?.sub;

    const product = await createProduct(request.body, authUserId);
    response.status(201).json(ok(product));
  } catch (error: any) {
    console.error("PRODUCT SAVE ERROR:", error);
    response.status(400).json(fail("PRODUCT_VALIDATION_FAILED", error.message || error.toString()));
  }
}
