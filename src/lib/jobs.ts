/**
 * Pure, side-effect-free helpers for working with job postings.
 *
 * These operate on plain `Job[]` arrays (already loaded from the content
 * collection by the calling page) so they can be unit tested without the Astro
 * content runtime or a database.
 */
import type { Job } from '../types/job';

/** Return jobs sorted by posted date, newest first (does not mutate input). */
export function sortByNewest(jobs: Job[]): Job[] {
    return [...jobs].sort(
        (a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime(),
    );
}

/**
 * Selected filter values; an empty list means "no restriction" for that group.
 */
export interface RoleFilterSelection {
    /** Selected department names. */
    departments: string[];
    /** Selected location regions, as returned by {@link getLocationRegion}. */
    regions: string[];
}

/**
 * Group a location by country/region: the last comma-separated segment, or
 * "Remote" for remote locations.
 *
 * @param location - A job location, e.g. "Chicago, IL, USA".
 * @returns The region, e.g. "USA".
 */
export function getLocationRegion(location: string): string {
    const trimmed = location.trim();
    if (/^remote\b/i.test(trimmed)) {
        return 'Remote';
    }
    const segments = trimmed.split(',');
    return segments[segments.length - 1].trim();
}

/**
 * Return the unique, alphabetically sorted departments.
 *
 * @param jobs - The jobs to read departments from.
 * @returns Distinct department names.
 */
export function getDepartments(jobs: Job[]): string[] {
    return [...new Set(jobs.map((job) => job.department))].sort((a, b) => a.localeCompare(b));
}

/**
 * Return the unique, alphabetically sorted location regions.
 *
 * @param jobs - The jobs to read locations from.
 * @returns Distinct regions, as returned by {@link getLocationRegion}.
 */
export function getLocationRegions(jobs: Job[]): string[] {
    return [...new Set(jobs.map((job) => getLocationRegion(job.location)))].sort((a, b) =>
        a.localeCompare(b),
    );
}

/**
 * Filter jobs by selected departments and regions. A job matches when it is in
 * ANY selected department OR ANY selected region. No selection returns all jobs.
 *
 * @param jobs - The jobs to filter (not mutated).
 * @param selection - The selected departments and regions.
 * @returns A new array of matching jobs.
 */
export function filterJobs(jobs: Job[], selection: RoleFilterSelection): Job[] {
    if (selection.departments.length === 0 && selection.regions.length === 0) {
        return [...jobs];
    }
    return jobs.filter(
        (job) =>
            selection.departments.includes(job.department) ||
            selection.regions.includes(getLocationRegion(job.location)),
    );
}

/**
 * Format an ISO-8601 date as a human-readable posted date,
 * e.g. "January 5, 2027". Falls back to the raw value if unparseable.
 */
export function formatPostedDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}
