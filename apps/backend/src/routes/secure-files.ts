import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { SignedUrlService } from "../services/signed-url-service";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { User } from "../models";

/**
 * Secure File Routes
 *
 * Provides secure file access using signed URLs instead of JWT tokens.
 * Routes:
 *   POST /api/v1/files/signed-url - Generate signed URL for file access
 *   GET /api/v1/files/secure/:token - Serve file with signature validation
 */

export async function secureFilesRoutes(fastify: FastifyInstance) {
  console.log('🔐 Registering secure files routes...');

  /**
   * Generate a signed URL for secure file access
   * POST /api/v1/files/signed-url
   */
  fastify.post(
    "/signed-url",
    { preHandler: authenticate },
    async (request, reply) => {
      const user: any = (request as any).user;
      const body = request.body as any;

      const {
        fileId,
        tenantId,
        scope,
        ownerId,
        filename,
        action = 'view',
        expiresInMinutes,
      } = body;

      // Validate required fields
      if (!filename || !scope || !ownerId) {
        return reply.code(400).send({
          success: false,
          error: "Missing required fields: filename, scope, ownerId",
        });
      }

      // Use tenant from request body or user's tenant
      const fileTenantId = tenantId || user.tenantId;

      // Verify user has access to this tenant
      if (String(user.tenantId) !== String(fileTenantId)) {
        return reply.code(403).send({
          success: false,
          error: "Access denied: You don't have access to this tenant's files",
        });
      }

      // Verify file exists (optional but recommended for security)
      const filePath = path.join(
        process.cwd(),
        "uploads",
        String(fileTenantId),
        scope,
        String(ownerId),
        filename
      );

      try {
        await fs.access(filePath);
      } catch (error) {
        fastify.log.warn(
          { filePath, tenantId: fileTenantId, scope, ownerId, filename },
          "File not found when generating signed URL"
        );
        return reply.code(404).send({
          success: false,
          error: "File not found",
        });
      }

      // Generate signed URL
      const signedUrlData = SignedUrlService.generateSignedUrl({
        tenantId: String(fileTenantId),
        scope,
        ownerId: String(ownerId),
        filename,
        action,
        expiresInMinutes,
      });

      fastify.log.info(
        {
          tenantId: fileTenantId,
          scope,
          ownerId,
          filename,
          action,
          expiresAt: new Date(signedUrlData.expiresAt).toISOString(),
        },
        "Generated signed URL for file access"
      );

      return reply.send({
        success: true,
        data: {
          url: signedUrlData.url,
          expiresAt: signedUrlData.expiresAt,
          expiresIn: SignedUrlService.getTimeRemaining(signedUrlData.expiresAt),
        },
      });
    }
  );

  /**
   * Generate signed URLs for multiple files at once
   * POST /api/v1/files/signed-urls/batch
   */
  fastify.post(
    "/signed-urls/batch",
    { preHandler: authenticate },
    async (request, reply) => {
      const user: any = (request as any).user;
      const body = request.body as any;

      const { files, action = 'view', expiresInMinutes } = body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return reply.code(400).send({
          success: false,
          error: "Missing or invalid files array",
        });
      }

      // Verify all files belong to user's tenant
      const invalidFiles = files.filter(
        (file) => String(file.tenantId || user.tenantId) !== String(user.tenantId)
      );

      if (invalidFiles.length > 0) {
        return reply.code(403).send({
          success: false,
          error: "Access denied: Some files don't belong to your tenant",
        });
      }

      // Generate signed URLs for all files
      const signedUrls = files.map((file) => {
        const fileTenantId = file.tenantId || user.tenantId;
        const signedUrlData = SignedUrlService.generateSignedUrl({
          tenantId: String(fileTenantId),
          scope: file.scope,
          ownerId: String(file.ownerId),
          filename: file.filename,
          action,
          expiresInMinutes,
        });

        return {
          filename: file.filename,
          url: signedUrlData.url,
          expiresAt: signedUrlData.expiresAt,
        };
      });

      fastify.log.info(
        {
          tenantId: user.tenantId,
          fileCount: files.length,
          action,
        },
        "Generated batch signed URLs"
      );

      return reply.send({
        success: true,
        data: signedUrls,
      });
    }
  );

  /**
   * Serve file with signed URL validation
   * GET /api/v1/files/secure/:token
   *
   * No authentication required - security is provided by the signature
   * Note: Using wildcard (*) to capture tokens with periods (signature separator)
   */
  fastify.get("/secure/*", async (request, reply) => {
    const params = request.params as any;
    // Extract token from wildcard parameter
    const token = params['*'];

    // Verify signature
    const verified = SignedUrlService.verifySignedUrl(token);

    if (!verified.valid) {
      if (verified.expired) {
        fastify.log.warn({ token: token.substring(0, 20) }, "Expired signed URL");
        return reply.code(410).send({
          success: false,
          error: "This link has expired. Please request a new one.",
        });
      }

      fastify.log.warn({ token: token.substring(0, 20) }, "Invalid signed URL");
      return reply.code(403).send({
        success: false,
        error: "Invalid or tampered URL",
      });
    }

    const { tenantId, scope, ownerId, filename, action } = verified;

    // Construct file path
    const filePath = path.join(
      process.cwd(),
      "uploads",
      tenantId!,
      scope!,
      ownerId!,
      filename!
    );

    fastify.log.info(
      {
        tenantId,
        scope,
        ownerId,
        filename,
        action,
        filePath,
      },
      "Serving file with signed URL"
    );

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      fastify.log.error(
        {
          filePath,
          tenantId,
          scope,
          ownerId,
          filename,
        },
        "File not found"
      );
      return reply.code(404).send({
        success: false,
        error: "File not found",
      });
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".svg": "image/svg+xml",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".json": "application/json",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    // Set headers
    reply.header("Content-Type", contentType);
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");

    // Set Content-Disposition based on action
    if (action === 'download') {
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      reply.header("Content-Disposition", "inline");
    }

    // Add CORS headers
    const origin = request.headers.origin;
    if (origin) {
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".progressnet.io") ||
        origin === "https://progressnet.io" ||
        origin === "https://www.progressnet.io" ||
        origin.startsWith("https://")
      ) {
        reply.header("Access-Control-Allow-Origin", origin);
        reply.header("Access-Control-Allow-Credentials", "true");
      } else {
        reply.header("Access-Control-Allow-Origin", "*");
      }
    } else {
      reply.header("Access-Control-Allow-Origin", "*");
    }

    reply.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    reply.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );

    // Security headers
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "SAMEORIGIN");

    // Cache control - short cache for signed URLs since they expire
    reply.header("Cache-Control", "private, max-age=300"); // 5 minutes

    // Stream the file
    return reply.send(createReadStream(filePath));
  });

  /**
   * OPTIONS handler for CORS preflight
   * Note: Using wildcard (*) to match tokens with periods
   */
  fastify.options("/secure/*", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin) {
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".progressnet.io") ||
        origin === "https://progressnet.io" ||
        origin === "https://www.progressnet.io" ||
        origin.startsWith("https://")
      ) {
        reply.header("Access-Control-Allow-Origin", origin);
        reply.header("Access-Control-Allow-Credentials", "true");
      } else {
        reply.header("Access-Control-Allow-Origin", "*");
      }
    } else {
      reply.header("Access-Control-Allow-Origin", "*");
    }
    reply.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    reply.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    reply.header("Access-Control-Max-Age", "86400"); // 24 hours
    reply.code(200).send();
  });
}
