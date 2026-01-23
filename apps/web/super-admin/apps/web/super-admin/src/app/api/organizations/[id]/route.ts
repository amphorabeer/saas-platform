import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Neon API configuration
const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_API_BASE = "https://console.neon.tech/api/v2";

async function deleteNeonBranch(databaseUrl: string): Promise<boolean> {
  if (!NEON_API_KEY) {
    console.warn("[Neon] API key not configured, skipping database deletion");
    return false;
  }

  try {
    // Extract project ID and branch from database URL
    // Format: postgresql://user:pass@ep-xxx-yyy-projectid.region.aws.neon.tech/dbname
    const match = databaseUrl.match(/ep-([^.]+)\.([^.]+)\.aws\.neon\.tech/);
    if (!match) {
      console.warn("[Neon] Could not parse database URL:", databaseUrl);
      return false;
    }

    const endpoint = match[1];
    console.log(`[Neon] Attempting to delete endpoint: ${endpoint}`);

    // First, get the project and branch info
    const projectsResponse = await fetch(`${NEON_API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${NEON_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!projectsResponse.ok) {
      console.error("[Neon] Failed to fetch projects:", await projectsResponse.text());
      return false;
    }

    const { projects } = await projectsResponse.json();
    
    // Find project containing this endpoint
    for (const project of projects) {
      const endpointsResponse = await fetch(
        `${NEON_API_BASE}/projects/${project.id}/endpoints`,
        {
          headers: {
            Authorization: `Bearer ${NEON_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!endpointsResponse.ok) continue;

      const { endpoints } = await endpointsResponse.json();
      const targetEndpoint = endpoints.find((ep: any) => ep.host.includes(endpoint));

      if (targetEndpoint) {
        // Delete the branch (this will also delete the endpoint)
        const deleteResponse = await fetch(
          `${NEON_API_BASE}/projects/${project.id}/branches/${targetEndpoint.branch_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${NEON_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (deleteResponse.ok) {
          console.log(`[Neon] Successfully deleted branch: ${targetEndpoint.branch_id}`);
          return true;
        } else {
          console.error("[Neon] Failed to delete branch:", await deleteResponse.text());
          return false;
        }
      }
    }

    console.warn("[Neon] Endpoint not found in any project");
    return false;
  } catch (error) {
    console.error("[Neon] Error deleting database:", error);
    return false;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get organization to find databaseUrl
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, databaseUrl: true, tenantId: true }
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Delete Neon database if exists
    let neonDeleted = false;
    if (organization.databaseUrl) {
      neonDeleted = await deleteNeonBranch(organization.databaseUrl);
    }

    // Delete organization from database (cascade will delete related records)
    await prisma.organization.delete({
      where: { id }
    });

    console.log(`[DELETE] Organization deleted: ${organization.name} (${id}), Neon: ${neonDeleted}`);

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
      neonDeleted
    });

  } catch (error: any) {
    console.error("[DELETE] Error deleting organization:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: true,
        subscription: true
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);

  } catch (error: any) {
    console.error("[GET] Error fetching organization:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
