"use client";

/**
 * Weight Scale Service (Web Serial API)
 * ACLAS / CAS protocol for industrial scales
 */

interface SerialPort {
  open(opts: { baudRate: number }): Promise<void>;
  readable?: ReadableStream;
  writable?: WritableStream;
  close(): Promise<void>;
}

export type ScaleProtocol = "ACLAS" | "CAS";

export interface ScaleSettings {
  port?: string;
  baudRate?: number;
  protocol?: ScaleProtocol;
}

export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
}

/**
 * Parse ACLAS/CAS protocol response.
 * Typical format: "     0.450 kg" or "0.450kg"
 */
function parseScaleResponse(data: string, protocol: ScaleProtocol): ScaleReading | null {
  const cleaned = data.replace(/\r\n/g, "").trim();
  const match = cleaned.match(/([+-]?\d+[.,]?\d*)\s*([a-zA-Z]+)/);
  if (!match) return null;
  const weight = parseFloat(match[1]!.replace(",", "."));
  const unit = match[2]!.toLowerCase();
  return { weight, unit, stable: true };
}

/**
 * Request weight from scale via Web Serial
 */
export async function readWeightFromScale(
  settings: ScaleSettings = {}
): Promise<{ success: boolean; weight?: number; unit?: string; error?: string }> {
  if (!("serial" in navigator)) {
    return { success: false, error: "Web Serial API არ არის მხარდაჭერილი" };
  }
  try {
    const serial = (navigator as { serial?: { requestPort: () => Promise<SerialPort> } }).serial;
    if (!serial) return { success: false, error: "Web Serial API არ არის მხარდაჭერილი" };
    const port = await serial.requestPort();
    await port.open({ baudRate: settings.baudRate ?? 9600 });

    const reader = port.readable?.getReader();
    const writer = port.writable?.getWriter();
    if (!reader || !writer) {
      await port.close();
      return { success: false, error: "პორტის წვდომა ვერ მოხერხდა" };
    }

    const protocol = settings.protocol ?? "ACLAS";
    const requestCmd = protocol === "CAS" ? "\r\n" : "W\r\n";
    await writer.write(new TextEncoder().encode(requestCmd));
    writer.releaseLock();

    const { value } = await reader.read();
    reader.releaseLock();
    await port.close();

    if (!value) return { success: false, error: "პასუხი ცარიელია" };
    const str = new TextDecoder().decode(value);
    const reading = parseScaleResponse(str, protocol);
    if (!reading) return { success: false, error: "პასუხის პარსირება ვერ მოხერხდა" };

    return { success: true, weight: reading.weight, unit: reading.unit };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "სასწორის შეცდომა" };
  }
}
