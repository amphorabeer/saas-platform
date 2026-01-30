import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { qrCode: string } }
) {
  try {
    const stop = await prisma.tourStop.findFirst({
      where: { qrCode: params.qrCode },
      include: {
        tour: {
          include: {
            museum: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!stop) {
      return NextResponse.json(
        { error: "გაჩერება ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      stop,
      tour: stop.tour,
      museum: stop.tour.museum,
    });
  } catch (error) {
    console.error("Error fetching stop by QR:", error);
    return NextResponse.json(
      { error: "Failed to fetch stop" },
      { status: 500 }
    );
  }
}
