# Decisions Log

One line per non-obvious choice, appended live during implementation — this feeds the README's "what was cut and why" section directly, so it's written in the moment, not reconstructed at the end.

- **2026-08-08 — Scope cut: web track only.** `media-native` and `media-ui-native` are not implemented in this pass. The spec's app deliverable is React web; building both platforms in the same ~9hr budget would have thinned every layer rather than delivering two solid ones. `media-core`'s API and the `media-ui-react` prop-getter shapes are designed so a native wrapper/component pair could be added later without changing either. Confirmed with the requester before starting implementation.
- **2026-08-08 — useLightbox ships a simplified focus model, not a full cyclic focus trap.** Focus moves into the dialog on open and Escape/Arrow keys work via a document-level listener, but Tab does not yet wrap from the last focusable element back to the first. Full trap cycling was cut for time; the prop-getter shape (`getOverlayProps` returning `ref`/`role`/`aria-modal`/`tabIndex`) doesn't need to change to add it later.
