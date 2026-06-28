/**
 * OmniQ product service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { createProduct, getProduct, listProducts } from "../services/productService";

export async function listProductsController(_request: Request, response: Response): Promise<void> {
  try {
    const products = await listProducts();
    response.json(ok(products, { page: 1, limit: 20, total: products.length }));
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

import { supabase } from "../../../../shared/utils/supabaseClient";

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
        const { error } = await supabase.storage.from("product-images").upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });
        if (error) throw new Error(`Image upload failed: ${error.message}`);
        
        const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
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

    const product = await createProduct(request.body);
    response.status(201).json(ok(product));
  } catch (error: any) {
    response.status(400).json(fail("PRODUCT_VALIDATION_FAILED", error.message));
  }
}
