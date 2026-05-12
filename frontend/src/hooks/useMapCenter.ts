export type CenterEvent = { lng: number; lat: number; zoom?: number };

const channel = new EventTarget();

export function requestMapCenter(ev: CenterEvent) {
  channel.dispatchEvent(new CustomEvent<CenterEvent>("center", { detail: ev }));
}

export function onMapCenter(handler: (ev: CenterEvent) => void): () => void {
  const wrap = (e: Event) => handler((e as CustomEvent<CenterEvent>).detail);
  channel.addEventListener("center", wrap);
  return () => channel.removeEventListener("center", wrap);
}
