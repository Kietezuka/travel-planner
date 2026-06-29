import { describe, it, expect } from "vitest";
import {
    validateTripInput,
    validateActivityInput,
    validateAccommodationInput,
    findOverlappingActivity,
    findOverlappingAccommodation,
    toMinutes,
} from "./tripValidation";

describe("toMinutes", () => {
    it("converts HH:MM to minutes", () => {
        expect(toMinutes("09:30")).toBe(570);
        expect(toMinutes("00:00")).toBe(0);
        expect(toMinutes("23:30")).toBe(1410);
    });
    it("returns 0 for empty input", () => {
        expect(toMinutes("")).toBe(0);
        expect(toMinutes(null)).toBe(0);
    });
});

describe("validateTripInput", () => {
    it("accepts a valid trip", () => {
        expect(validateTripInput("Kyoto", "2026-06-15", "2026-06-18")).toBeNull();
    });
    it("accepts a single-day trip", () => {
        expect(validateTripInput("Kyoto", "2026-06-15", "2026-06-15")).toBeNull();
    });
    it("rejects a missing destination", () => {
        expect(validateTripInput("", "2026-06-15", "2026-06-18")).toMatch(/Destination/);
    });
    it("rejects malformed dates", () => {
        expect(validateTripInput("Kyoto", "06/15/2026", "2026-06-18")).toMatch(/invalid/);
        expect(validateTripInput("Kyoto", "2026-06-15", undefined)).toMatch(/invalid/);
    });
    it("rejects end before start", () => {
        expect(validateTripInput("Kyoto", "2026-06-18", "2026-06-15")).toMatch(/on or after/);
    });
    it("accepts long trips (no duration cap)", () => {
        expect(validateTripInput("Kyoto", "2026-06-01", "2026-07-15")).toBeNull();
    });
});

describe("validateActivityInput", () => {
    const valid = { title: "Fushimi Inari", date: "2026-06-15", startTime: "09:00", endTime: "11:00" };

    it("accepts a valid activity", () => {
        expect(validateActivityInput(valid)).toBeNull();
    });
    it("rejects a blank title", () => {
        expect(validateActivityInput({ ...valid, title: "   " })).toMatch(/Title/);
    });
    it("rejects bad time formats", () => {
        expect(validateActivityInput({ ...valid, startTime: "9:00" })).toMatch(/Times/);
        expect(validateActivityInput({ ...valid, endTime: "25:00" })).toMatch(/Times/);
    });
    it("rejects end <= start", () => {
        expect(validateActivityInput({ ...valid, startTime: "11:00", endTime: "11:00" })).toMatch(/after/);
        expect(validateActivityInput({ ...valid, startTime: "11:00", endTime: "10:00" })).toMatch(/after/);
    });
});

describe("validateAccommodationInput", () => {
    const valid = {
        title: "Gion Hotel",
        checkinDate: "2026-06-15", checkinTime: "15:00",
        checkoutDate: "2026-06-18", checkoutTime: "10:00",
    };

    it("accepts a valid stay", () => {
        expect(validateAccommodationInput(valid)).toBeNull();
    });
    it("accepts same-day stays when checkout time is later", () => {
        expect(validateAccommodationInput({ ...valid, checkoutDate: "2026-06-15", checkinTime: "10:00", checkoutTime: "15:00" })).toBeNull();
    });
    it("rejects checkout before checkin", () => {
        expect(validateAccommodationInput({ ...valid, checkoutDate: "2026-06-14" })).toMatch(/after/);
        expect(validateAccommodationInput({ ...valid, checkoutDate: "2026-06-15", checkoutTime: "14:00" })).toMatch(/after/);
    });
    it("rejects a missing check-in or check-out time", () => {
        expect(validateAccommodationInput({ ...valid, checkinTime: "" })).toMatch(/Times/);
        expect(validateAccommodationInput({ ...valid, checkoutTime: undefined })).toMatch(/Times/);
    });
});

describe("findOverlappingActivity", () => {
    const existing = [
        { id: 1, title: "Morning", startTime: "09:00", endTime: "11:00" },
        { id: 2, title: "Lunch", startTime: "12:00", endTime: "13:00" },
    ];

    it("detects a partial overlap", () => {
        expect(findOverlappingActivity(existing, "10:30", "12:30")?.id).toBe(1);
    });
    it("detects full containment", () => {
        expect(findOverlappingActivity(existing, "08:00", "14:00")?.id).toBe(1);
    });
    it("allows back-to-back slots", () => {
        expect(findOverlappingActivity(existing, "11:00", "12:00")).toBeNull();
        expect(findOverlappingActivity(existing, "13:00", "14:00")).toBeNull();
    });
    it("excludes the activity being edited", () => {
        expect(findOverlappingActivity(existing, "09:30", "10:30", 1)).toBeNull();
        // string/number id mismatch must still match (DB ids vs client ids)
        expect(findOverlappingActivity(existing, "09:30", "10:30", "1")).toBeNull();
    });
});

describe("findOverlappingAccommodation", () => {
    const existing = [
        { id: 1, title: "Gion Hotel", checkinDate: "2026-06-15", checkinTime: "15:00", checkoutDate: "2026-06-18", checkoutTime: "10:00" },
    ];

    it("detects a stay fully inside an existing multi-day booking", () => {
        expect(findOverlappingAccommodation(existing, "2026-06-16T15:00", "2026-06-17T10:00")?.id).toBe(1);
    });
    it("detects a partial overlap", () => {
        expect(findOverlappingAccommodation(existing, "2026-06-14T12:00", "2026-06-16T10:00")?.id).toBe(1);
    });
    it("allows a stay starting exactly at the existing check-out", () => {
        expect(findOverlappingAccommodation(existing, "2026-06-18T10:00", "2026-06-20T10:00")).toBeNull();
    });
    it("allows a fully separate stay", () => {
        expect(findOverlappingAccommodation(existing, "2026-06-20T15:00", "2026-06-22T10:00")).toBeNull();
    });
    it("excludes the stay being edited (string/number id)", () => {
        expect(findOverlappingAccommodation(existing, "2026-06-15T15:00", "2026-06-18T10:00", "1")).toBeNull();
    });
});
