export type CenterEvent = {
  lng: number;
  lat: number;
  zoom?: number;
  /** Optional override; otherwise MapCanvas computes padding from
   *  the current panel + inspector geometry so the target lands in
   *  the visible map area to the right of the side menus. */
  padding?: { left: number; right: number; top: number; bottom: number };
};

const channel = new EventTarget();

export function requestMapCenter(ev: CenterEvent) {
  channel.dispatchEvent(new CustomEvent<CenterEvent>("center", { detail: ev }));
}

export function onMapCenter(handler: (ev: CenterEvent) => void): () => void {
  const wrap = (e: Event) => handler((e as CustomEvent<CenterEvent>).detail);
  channel.addEventListener("center", wrap);
  return () => channel.removeEventListener("center", wrap);
}
