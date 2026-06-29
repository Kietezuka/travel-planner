"use client";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// false during SSR/hydration, true after — without setState-in-effect.
export default function useHydrated() {
    return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
