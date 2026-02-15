/**
 * ESC/POS command constants for thermal receipt printers.
 * Supported: Epson, Bixolon, Star, SPRT, Rongta, Xprinter, GPrinter
 */

export const ESC = "\x1b";
export const GS = "\x1d";
export const FS = "\x1c";

export const ESCPOS = {
  /** Reset */
  RESET: ESC + "@",
  /** Bold on/off */
  BOLD_ON: ESC + "E" + "\x01",
  BOLD_OFF: ESC + "E" + "\x00",
  /** Double height */
  DOUBLE_HEIGHT_ON: ESC + "!" + "\x10",
  DOUBLE_HEIGHT_OFF: ESC + "!" + "\x00",
  /** Align */
  ALIGN_LEFT: ESC + "a" + "\x00",
  ALIGN_CENTER: ESC + "a" + "\x01",
  ALIGN_RIGHT: ESC + "a" + "\x02",
  /** Cut */
  CUT: GS + "V" + "\x00",
  /** Feed */
  FEED: (n: number) => ESC + "d" + String.fromCharCode(Math.min(255, n)),
  /** Init */
  INIT: ESC + "@",
};

export function centerText(text: string, width: number = 32): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

export function line(char: string = "-", width: number = 32): string {
  return char.repeat(width);
}
