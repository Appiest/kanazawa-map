/**
 * The map payload. Every pin costs 12 bytes: a sequence number and a
 * fixed-point coordinate pair. Names and notes are not in here; they are
 * fetched per pin when someone opens one, so the bulk download stays flat
 * as the map fills up.
 *
 * 100k pins is 1.2 MB before compression, which the edge cache serves as a
 * single response. Both sides read the layout from this file so the encoder
 * and the worker cannot drift apart.
 */

export const BYTES_PER_PIN = 12;

/** Six decimal places of longitude is ~11 cm at the equator. */
export const COORD_SCALE = 1e6;

export type PinPoint = { seq: number; lng: number; lat: number };

export function encodePins(pins: readonly PinPoint[]): Uint8Array {
  const buffer = new ArrayBuffer(pins.length * BYTES_PER_PIN);
  const view = new DataView(buffer);
  pins.forEach((pin, index) => {
    const offset = index * BYTES_PER_PIN;
    view.setUint32(offset, pin.seq, true);
    view.setInt32(offset + 4, Math.round(pin.lng * COORD_SCALE), true);
    view.setInt32(offset + 8, Math.round(pin.lat * COORD_SCALE), true);
  });
  return new Uint8Array(buffer);
}

export function decodePins(buffer: ArrayBuffer): PinPoint[] {
  const view = new DataView(buffer);
  const count = Math.floor(buffer.byteLength / BYTES_PER_PIN);
  const pins: PinPoint[] = new Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * BYTES_PER_PIN;
    pins[index] = {
      seq: view.getUint32(offset, true),
      lng: view.getInt32(offset + 4, true) / COORD_SCALE,
      lat: view.getInt32(offset + 8, true) / COORD_SCALE,
    };
  }
  return pins;
}
