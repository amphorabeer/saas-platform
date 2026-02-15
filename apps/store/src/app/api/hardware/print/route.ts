import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDefaultStore } from "@/lib/store";
import { prisma } from "@/lib/prisma";

/**
 * Server-side network printing proxy.
 * Browser cannot open raw TCP; this API sends ESC/POS to network printer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ip, port, data } = body as {
      type: string;
      ip?: string;
      port?: number;
      data?: number[];
    };

    if (type !== "network" || !ip || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "არასწორი მოთხოვნა" },
        { status: 400 }
      );
    }

    // Optional: verify store has this printer configured
    const storeId = await getOrCreateDefaultStore();
    const db = prisma as {
      storeDeviceConfig?: {
        findFirst: (opts: object) => Promise<{ id: string } | null>;
      };
    };
    if (db.storeDeviceConfig) {
      const device = await db.storeDeviceConfig.findFirst({
        where: {
          storeId,
          deviceType: "RECEIPT_PRINTER",
          isActive: true,
        },
      });
      if (!device) {
        return NextResponse.json(
          { error: "პრინტერი არ არის კონფიგურირებული" },
          { status: 403 }
        );
      }
    }

    const portNum = port ?? 9100;
    const buffer = Buffer.from(data);
    const net = await import("net");
    const socket = new net.Socket();
    const timeout = 5000;

    await new Promise<void>((resolve, reject) => {
      socket.setTimeout(timeout);
      socket.on("error", reject);
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("დრო ამოიწურა"));
      });
      socket.connect(portNum, ip, () => {
        socket.write(buffer, () => {
          socket.end();
          resolve();
        });
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Print error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ბეჭდვის შეცდომა" },
      { status: 500 }
    );
  }
}
