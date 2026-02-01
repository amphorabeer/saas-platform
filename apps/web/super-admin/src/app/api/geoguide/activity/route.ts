import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get recent redeemed codes with their entitlements
    const recentEntitlements = await prisma.entitlement.findMany({
      where: {
        activationCodeId: { not: null },
      },
      orderBy: { activatedAt: "desc" },
      take: 5,
      include: {
        activationCode: {
          select: { code: true },
        },
        tour: {
          select: { 
            name: true,
            museum: { select: { name: true } },
          },
        },
      },
    });

    // Get recent completed payments
    const recentPayments = await prisma.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: {
        tour: { 
          select: { 
            name: true,
            museum: { select: { name: true } },
          } 
        },
      },
    });

    // Get recent tours
    const recentTours = await prisma.tour.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, createdAt: true },
    });

    // Get recent museums
    const recentMuseums = await prisma.museum.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, createdAt: true },
    });

    // Combine and sort activities
    const activities: {
      id: string;
      type: "code_redeemed" | "tour_created" | "museum_created" | "payment_completed";
      description: string;
      createdAt: Date;
    }[] = [];

    // Add redeemed codes from entitlements
    recentEntitlements.forEach((ent) => {
      activities.push({
        id: `code-${ent.id}`,
        type: "code_redeemed",
        description: `კოდი გააქტიურდა: ${ent.activationCode?.code || "—"} (${ent.tour.museum.name} - ${ent.tour.name})`,
        createdAt: ent.activatedAt,
      });
    });

    // Add completed payments
    recentPayments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: "payment_completed",
        description: `გადახდა: ₾${payment.amount} (${payment.tour.museum.name} - ${payment.tour.name})`,
        createdAt: payment.completedAt || payment.createdAt,
      });
    });

    // Add tours
    recentTours.forEach((tour) => {
      activities.push({
        id: `tour-${tour.id}`,
        type: "tour_created",
        description: `ახალი ტური: ${tour.name}`,
        createdAt: tour.createdAt,
      });
    });

    // Add museums
    recentMuseums.forEach((museum) => {
      activities.push({
        id: `museum-${museum.id}`,
        type: "museum_created",
        description: `ახალი მუზეუმი: ${museum.name}`,
        createdAt: museum.createdAt,
      });
    });

    // Sort by date and take top 10
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const topActivities = activities.slice(0, 10);

    return NextResponse.json(topActivities);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json([], { status: 200 });
  }
}