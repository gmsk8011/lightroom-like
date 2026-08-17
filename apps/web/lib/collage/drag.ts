/** Custom drag payload type carrying a photo id — set by the filmstrip when
 *  dragging a photo out, read by a collage cell on drop. Kept as one shared
 *  constant so the two ends can't drift out of sync with each other, and so
 *  a collage cell's drop handler can tell "a photo was dragged onto me"
 *  apart from an OS file drag (which has no data under this type), letting
 *  it fall through to the normal import-by-drop handler instead. */
export const PHOTO_DRAG_TYPE = "application/x-framer-photo-id";
