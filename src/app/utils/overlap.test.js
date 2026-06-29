import { describe, it, expect } from "vitest";
import { checkActivityOverlap, checkAccommodationOverlap } from "./overlap";

describe("checkActivityOverlap", () => {
    const activities = [
        { id: "a1", title: "Shrine", date: "2026-06-15", startTime: "09:00", endTime: "11:00" },
        { id: "a2", title: "Lunch", date: "2026-06-15", startTime: "12:00", endTime: "13:00" },
        { id: "a3", title: "Other day", date: "2026-06-16", startTime: "09:00", endTime: "11:00" },
    ];

    it("finds an overlap on the same day", () => {
        expect(checkActivityOverlap(activities, "10:00", "12:30", "2026-06-15")?.id).toBe("a1");
    });
    it("ignores other days", () => {
        expect(checkActivityOverlap(activities, "09:00", "11:00", "2026-06-17")).toBeNull();
    });
    it("allows adjacent times", () => {
        expect(checkActivityOverlap(activities, "11:00", "12:00", "2026-06-15")).toBeNull();
    });
    it("excludes the edited activity by id", () => {
        expect(checkActivityOverlap(activities, "09:30", "10:30", "2026-06-15", "a1")).toBeNull();
    });
    it("excludes the edited activity even when id types differ (number vs string)", () => {
        const numericId = [{ id: 1, date: "2026-06-15", startTime: "09:00", endTime: "11:00" }];
        expect(checkActivityOverlap(numericId, "09:30", "10:30", "2026-06-15", "1")).toBeNull();
    });
});

describe("checkAccommodationOverlap", () => {
    const stays = [
        { id: "h1", title: "Gion Hotel", checkinDate: "2026-06-15", checkinTime: "15:00", checkoutDate: "2026-06-18", checkoutTime: "10:00" },
    ];

    it("detects a stay fully inside an existing multi-day booking", () => {
        expect(checkAccommodationOverlap(stays, "2026-06-16T15:00", "2026-06-17T10:00")?.id).toBe("h1");
    });
    it("detects a partial overlap at the start", () => {
        expect(checkAccommodationOverlap(stays, "2026-06-14T12:00", "2026-06-16T10:00")?.id).toBe("h1");
    });
    it("allows a stay starting exactly at the existing check-out", () => {
        expect(checkAccommodationOverlap(stays, "2026-06-18T10:00", "2026-06-20T10:00")).toBeNull();
    });
    it("allows a stay ending exactly at the existing check-in", () => {
        expect(checkAccommodationOverlap(stays, "2026-06-12T10:00", "2026-06-15T15:00")).toBeNull();
    });
    it("allows a fully separate later stay", () => {
        expect(checkAccommodationOverlap(stays, "2026-06-20T15:00", "2026-06-22T10:00")).toBeNull();
    });
    it("excludes the stay being edited", () => {
        expect(checkAccommodationOverlap(stays, "2026-06-15T15:00", "2026-06-18T10:00", "h1")).toBeNull();
    });
});
