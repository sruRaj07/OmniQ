/**
 * OmniQ product service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { createProduct, getProduct, listProducts, listSellerProducts, searchProducts, getCategoryTags, updateProduct } from "../services/productService";

export async function listProductsController(request: Request, response: Response): Promise<void> {
  try {
    const sellerId = request.query.sellerId as string | undefined;
    const cursor = request.query.cursor as string | undefined;
    const limitParam = parseInt(request.query.limit as string);
    const limit = isNaN(limitParam) || limitParam <= 0 ? 20 : Math.min(limitParam, 50);

    const { products, nextCursor } = await listProducts(sellerId, cursor, limit);
    response.json(ok(products, { nextCursor, limit, total: products.length }));
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

    let existingImages: string[] = [];
    if (request.body.existing_images) {
      existingImages = Array.isArray(request.body.existing_images) 
        ? request.body.existing_images 
        : [request.body.existing_images];
    }
    request.body.images = [...existingImages, ...imageUrls];

    const payload = extractTokenPayload(request);
    const authUserId = payload?.sub;

    const product = await createProduct(request.body, authUserId);
    response.status(201).json(ok(product));
  } catch (error: any) {
    console.error("PRODUCT SAVE ERROR:", error);
    response.status(400).json(fail("PRODUCT_VALIDATION_FAILED", error.message || error.toString()));
  }
}

export async function updateProductController(request: Request, response: Response): Promise<void> {
  try {
    const id = request.params.id;
    if (!id) {
      response.status(400).json(fail("PRODUCT_VALIDATION_FAILED", "Product ID is required"));
      return;
    }

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

    let existingImages: string[] = [];
    if (request.body.existing_images) {
      existingImages = Array.isArray(request.body.existing_images) 
        ? request.body.existing_images 
        : [request.body.existing_images];
    }
    request.body.images = [...existingImages, ...imageUrls];

    const payload = extractTokenPayload(request);
    const authUserId = payload?.sub;
    if (!authUserId) {
      response.status(401).json(fail("UNAUTHORIZED", "Missing token"));
      return;
    }

    const product = await updateProduct(id, request.body, authUserId);
    response.status(200).json(ok(product));
  } catch (error: any) {
    console.error("PRODUCT UPDATE ERROR:", error);
    response.status(400).json(fail("PRODUCT_UPDATE_FAILED", error.message || error.toString()));
  }
}

export async function getAdvertisementsController(request: Request, response: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from("advertisements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch advertisements: ${error.message}`);
    }

    response.json(ok(data));
  } catch (error: any) {
    console.error("FETCH ADVERTISEMENTS ERROR:", error);
    response.status(500).json(fail("SERVER_ERROR", error.message || error.toString()));
  }
}

export async function searchProductsController(request: Request, response: Response): Promise<void> {
  try {
    const q = request.query.q as string | undefined;
    const category = request.query.category as string | undefined;
    const minPrice = request.query.minPrice ? Number(request.query.minPrice) : undefined;
    const maxPrice = request.query.maxPrice ? Number(request.query.maxPrice) : undefined;
    const sort = (request.query.sort as string | undefined) || "relevance";
    const limitParam = Number(request.query.limit);
    const limit = isNaN(limitParam) || limitParam <= 0 ? 20 : Math.min(limitParam, 50);
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    const suggestions = request.query.suggestions === "true";

    const result = await searchProducts({
      q,
      category,
      minPrice,
      maxPrice,
      sort: sort as any,
      limit,
      offset,
      suggestions,
    });

    response.json(ok(result.products, {
      total: result.total,
      limit,
      offset,
      ...(result.suggestions ? { suggestions: result.suggestions } : {}),
    }));
  } catch (error: any) {
    response.status(500).json(fail("SERVER_ERROR", error.message));
  }
}

export async function getCategoryTagsController(_request: Request, response: Response): Promise<void> {
  try {
    const tags = await getCategoryTags();
    response.json(ok({ tags }));
  } catch (error: any) {
    response.status(500).json(fail("SERVER_ERROR", error.message || "Failed to fetch category tags"));
  }
}
