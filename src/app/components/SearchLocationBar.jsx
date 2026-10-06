"use client";
import { useRef, useState, useEffect, useId } from "react"
import { useToast } from "./ToastProvider"

function formatSubtitle(address, name) {
    if (!address) return "";
    const city = [address.city, address.town, address.village].find(c => c && c !== name);
    const country = address.country || "";
    if (city) return `${city}, ${country}`;
    const state = address.state;
    if (state && state !== name && state !== country) return `${state}, ${country}`;
    if (country && country !== name) return country;
    return "";
}

export default function SearchLocationBar({ onSelect, onQueryChange, defaultValue="", type="address", destination="", inputId, label }){
    const showToast = useToast();
    const [query, setQuery] = useState(defaultValue || "");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [noResults, setNoResults] = useState(false);

    const abortRef = useRef(null);
    const wrapperRef = useRef(null);
    const listId = useId();

    useEffect(() => {
        setActiveIndex(-1);
    }, [results]);

    // Reflect a selection applied by the parent 
    // without wiping text the user is currently typing
    useEffect(() => {
        if (defaultValue) setQuery(defaultValue);
    }, [defaultValue]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setResults([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const handleQueryChange = (value) => {
        abortRef.current?.abort();
        abortRef.current = null;

        setQuery(value);
        onQueryChange?.(value);

        setResults([]);
        setActiveIndex(-1);
        setNoResults(false);
        setLoading(false);
    };

    const handleSearch = async() =>{
        const value = query.trim();

        if (value.length < 2 || loading) return;

        const controller = new AbortController();
        abortRef.current = controller;

        setResults([]);
        setActiveIndex(-1);
        setNoResults(false);
        setLoading(true);

        try {
                const queryString = (type !== "destination" && destination)
                    ? `${value}, ${destination}`
                    : value;
                const url = `/api/geocode?q=${encodeURIComponent(queryString)}&type=${encodeURIComponent(type)}`;
                const result = await fetch(url, { signal: controller.signal });

                if (!result.ok) {
                    throw new Error("Geocoding failed");
                }

                const data = await result.json();

                if (controller.signal.aborted) return;

                if (!Array.isArray(data)) {
                    throw new Error("Geocoding failed");
                }

                if(type === "destination"){
                    const destinationTypes = new Set([
                        "city", "town", "village", "hamlet", "island",
                        "country", "state", "region", "province", "municipality", "county"
                    ]);
                    const excludedClasses = new Set([
                        'aeroway', 'building', 'amenity', 'shop',
                        'highway', 'railway', 'man_made', 'tourism'
                    ]);
                    const queryLower = value.toLowerCase();

                    const filtered = data.filter(item =>
                        destinationTypes.has(item.addresstype) &&
                        !excludedClasses.has(item.class) &&
                        (item.name || '').toLowerCase().startsWith(queryLower)
                    );

                    const seen = new Map();
                    for (const item of filtered) {
                        const key = `${item.name}|${item.address?.country_code || ''}`;
                        if (!seen.has(key) || (item.importance || 0) > (seen.get(key).importance || 0)) {
                            seen.set(key, item);
                        }
                    }

                    let deduped = [...seen.values()]
                        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                        .slice(0, 10);

                    if (deduped.length === 0) {
                        const rawSeen = new Map();
                        for (const item of data) {
                            const key = `${item.name}|${item.address?.country_code || ''}`;
                            if (!rawSeen.has(key)) rawSeen.set(key, item);
                        }
                        deduped = [...rawSeen.values()]
                            .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                            .slice(0, 10);
                    }

                    setResults(deduped);
                    setNoResults(deduped.length === 0);
                } else {
                    const sliced = data.slice(0, 10);
                    setResults(sliced);
                    setNoResults(sliced.length === 0);
                }
            } catch (error) {
                if (error.name === "AbortError") return;

                showToast(
                    "Location search failed. Please try again.",
                    "error"
                );
            } finally {
                if (abortRef.current === controller) {
                    abortRef.current = null;
                    setLoading(false);
                }
            }
        };

    const selectOption = (option) => {
        onSelect(option);
        setQuery(option.name || option.display_name);
        setResults([]);
        setActiveIndex(-1);
        setNoResults(false);
    };

    const handleKeyDown = (e) => {
        if (
            e.nativeEvent.isComposing ||
            e.nativeEvent.keyCode === 229
        ) {
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();

            if (activeIndex >= 0 && results[activeIndex]) {
                selectOption(results[activeIndex]);
            } else {
                void handleSearch();
            }
            return;
        }

        if (e.key === "Escape" && results.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setResults([]);
            setActiveIndex(-1);
            return;
        }

        if (!results.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) =>
                Math.min(prev + 1, results.length - 1)
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, -1));
        }
    };

    const activeOptionId = activeIndex >= 0
        ? `${listId}-option-${activeIndex}`
        : undefined;

    const fieldLabel =
        label ||
        (type === "destination"
            ? "Destination"
            : type === "accommodation"
                ? "Hotel name or address"
                : "Address");

    return(
        <div className="text-field search-location__wrapper" ref={wrapperRef}>
            <div className="text-field__control">
                <input
                    type="text"
                    id={inputId}
                    className="text-field__input"
                    role="combobox"
                    aria-expanded={results.length > 0}
                    aria-haspopup="listbox"
                    aria-autocomplete="none"
                    aria-controls={listId}
                    aria-activedescendant={activeOptionId}
                    placeholder=" "
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <label htmlFor={inputId} className="text-field__label">{fieldLabel}</label>
            </div>
            <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading || query.trim().length < 2}
            >
                {loading ? "Searching..." : "Search"}
            </button>
            {loading && <span className="loading-message">Searching...</span>}
            {!loading && noResults && (
                <p className="search-no-results">No locations found. Try a different keyword.</p>
            )}
            {results.length > 0 && (
                <ul
                    id={listId}
                    className="result-list"
                    role="listbox"
                >
                    {results.map((option, index) => (
                        <li
                            key={option.place_id}
                            id={`${listId}-option-${index}`}
                            className={`result-list_item${index === activeIndex ? " is-active" : ""}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            onClick={() => selectOption(option)}
                        >
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#B7B7B7">
                                    <path d="M536.5-503.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-186q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/>
                                </svg>
                            </span>
                            <div className="result-text-wrapper">
                                <strong>{option.name}</strong>
                                <span>{formatSubtitle(option.address, option.name)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
