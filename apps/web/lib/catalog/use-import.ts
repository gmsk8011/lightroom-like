"use client";

import * as React from "react";
import { useCatalogStore } from "@/stores/catalog-store";
import { thumbnails } from "@/lib/thumbnails/service";
import {
  importFromDirectory,
  importFromFileList,
  supportsDirectoryPicker,
} from "./import";

export function useImport() {
  const addImport = useCatalogStore((s) => s.addImport);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Safari and Firefox have no directory picker, but they do support
  // webkitdirectory on a file input, so folder selection still works there —
  // only writing exports back to that folder does not.
  const nativePicker = supportsDirectoryPicker();

  const openPicker = React.useCallback(async () => {
    setError(null);

    if (!nativePicker) {
      inputRef.current?.click();
      return;
    }

    setBusy(true);
    try {
      const result = await importFromDirectory();
      if (result) {
        thumbnails.reset();
        addImport(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that folder");
    } finally {
      setBusy(false);
    }
  }, [addImport, nativePicker]);

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      thumbnails.reset();
      addImport(importFromFileList(files));
      // Reset so choosing the same folder again still fires a change event.
      event.target.value = "";
    },
    [addImport],
  );

  // `webkitdirectory` isn't in React's attribute types, so it's set directly
  // on the node. This callback ref also keeps `inputRef` populated.
  const attachInput = React.useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (node) node.setAttribute("webkitdirectory", "");
  }, []);

  return {
    openPicker,
    onInputChange,
    attachInput,
    busy,
    error,
    nativePicker,
  };
}
