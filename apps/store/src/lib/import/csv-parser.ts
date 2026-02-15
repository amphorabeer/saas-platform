import Papa from "papaparse";

const ENCODINGS = ["utf-8", "windows-1252", "iso-8859-1"] as const;

/** Detect if buffer looks like valid UTF-8 */
function isUtf8(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i]!;
    if (b <= 0x7f) {
      i++;
    } else if (b >= 0xc2 && b <= 0xdf && i + 1 < bytes.length) {
      if ((bytes[i + 1]! & 0xc0) !== 0x80) return false;
      i += 2;
    } else if (b >= 0xe0 && b <= 0xef && i + 2 < bytes.length) {
      if ((bytes[i + 1]! & 0xc0) !== 0x80 || (bytes[i + 2]! & 0xc0) !== 0x80) return false;
      i += 3;
    } else if (b >= 0xf0 && b <= 0xf4 && i + 3 < bytes.length) {
      if ((bytes[i + 1]! & 0xc0) !== 0x80 || (bytes[i + 2]! & 0xc0) !== 0x80 || (bytes[i + 3]! & 0xc0) !== 0x80) return false;
      i += 4;
    } else {
      return false;
    }
  }
  return true;
}

/** Decode buffer with encoding */
function decodeBuffer(buffer: ArrayBuffer, encoding: string): string {
  const decoder = new TextDecoder(encoding, { fatal: false });
  return decoder.decode(buffer);
}

export interface ParseCsvResult {
  data: Record<string, string>[];
  columns: string[];
  errors: string[];
}

export async function parseCsvFile(file: File): Promise<ParseCsvResult> {
  const buffer = await file.arrayBuffer();
  let text: string;

  if (isUtf8(buffer)) {
    text = decodeBuffer(buffer, "utf-8");
  } else {
    // Try Windows-1252 (common for Georgian/Excel exports)
    text = decodeBuffer(buffer, "windows-1252");
  }

  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (res: Papa.ParseResult<Record<string, string>>) => {
        const data = res.data.filter((r) =>
          Object.keys(r).some((k) => r[k]?.trim())
        );
        const columns = data.length
          ? (Array.from(new Set(data.flatMap((r) => Object.keys(r)))) as string[])
          : [];
        resolve({
          data,
          columns,
          errors: (res.errors || []).map((e) => e.message ?? "შეცდომა"),
        });
      },
    });
  });
}
