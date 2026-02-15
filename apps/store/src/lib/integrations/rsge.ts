"use server";

/**
 * RS.ge Integration - Server-side API client
 * საგადასახადო სამსახურის ინტეგრაცია
 */

import { getOrCreateDefaultStore } from "../store";

export interface RSGeCredentials {
  username: string;
  password: string;
}

export interface WaybillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}

export interface CreateWaybillRequest {
  type: "SALE" | "PURCHASE";
  date: string; // ISO
  items: WaybillItem[];
  total: number;
  customerTin?: string;
  customerName?: string;
  supplierTin?: string;
  supplierName?: string;
}

export interface WaybillResult {
  success: boolean;
  waybillId?: string;
  status?: string;
  error?: string;
}

export async function createRSGeWaybill(
  request: CreateWaybillRequest,
  credentials: RSGeCredentials
): Promise<WaybillResult> {
  try {
    const res = await fetch("https://api.rs.ge/v1/waybills", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
      },
      body: JSON.stringify({
        type: request.type,
        date: request.date,
        items: request.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
          taxRate: i.taxRate ?? 0,
        })),
        total: request.total,
        customerTin: request.customerTin,
        customerName: request.customerName,
        supplierTin: request.supplierTin,
        supplierName: request.supplierName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: (data as { message?: string }).message ?? "RS.ge API შეცდომა",
      };
    }
    return {
      success: true,
      waybillId: (data as { id?: string }).id,
      status: (data as { status?: string }).status,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "RS.ge კავშირის შეცდომა",
    };
  }
}

export async function getRSGeWaybillStatus(
  waybillId: string,
  credentials: RSGeCredentials
): Promise<WaybillResult> {
  try {
    const res = await fetch(`https://api.rs.ge/v1/waybills/${waybillId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: (data as { message?: string }).message ?? "RS.ge API შეცდომა",
      };
    }
    return {
      success: true,
      status: (data as { status?: string }).status,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "RS.ge კავშირის შეცდომა",
    };
  }
}
