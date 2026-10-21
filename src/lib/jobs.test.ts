import { describe, it, expect } from 'vitest';
import {
    sortByNewest,
    formatPostedDate,
    getLocationRegion,
    getDepartments,
    getLocationRegions,
    filterJobs,
} from './jobs';
import type { Job } from '../types/job';

function makeJob(slug: string, postedDate: string): Job {
    return {
        slug,
        title: `Role ${slug}`,
        department: 'Technology',
        location: 'Remote',
        type: 'Full-time',
        remote: true,
        postedDate,
        summary: 'A role.',
    };
}

describe('sortByNewest', () => {
    it('orders jobs by posted date, newest first', () => {
        const jobs = [
            makeJob('a', '2027-01-01'),
            makeJob('b', '2027-03-15'),
            makeJob('c', '2027-02-10'),
        ];
        expect(sortByNewest(jobs).map((j) => j.slug)).toEqual(['b', 'c', 'a']);
    });

    it('does not mutate the input array', () => {
        const jobs = [makeJob('a', '2027-01-01'), makeJob('b', '2027-03-15')];
        const original = jobs.map((j) => j.slug);
        sortByNewest(jobs);
        expect(jobs.map((j) => j.slug)).toEqual(original);
    });
});

/**
 * Build a job fixture with a specific department and location.
 *
 * @param slug - Job slug.
 * @param department - Department name.
 * @param location - Location string.
 * @returns A plain `Job` fixture.
 */
function makeLocatedJob(slug: string, department: string, location: string): Job {
    return { ...makeJob(slug, '2027-01-01'), department, location };
}

/** Jobs spanning several departments and regions for filter tests. */
const filterFixtures: Job[] = [
    makeLocatedJob('a', 'Finance', 'Chicago, IL, USA'),
    makeLocatedJob('b', 'Technology', 'Remote (US & Canada)'),
    makeLocatedJob('c', 'Finance', 'London, United Kingdom'),
    makeLocatedJob('d', 'Sales', 'Vancouver, Canada'),
];

/**
 * Extract slugs from jobs for concise assertions.
 *
 * @param jobs - Jobs to read.
 * @returns The job slugs in order.
 */
const slugs = (jobs: Job[]): string[] => jobs.map((job) => job.slug);

describe('getLocationRegion', () => {
    it('uses the last comma segment', () => {
        expect(getLocationRegion('Chicago, IL, USA')).toBe('USA');
        expect(getLocationRegion('Helsinki, Finland')).toBe('Finland');
    });

    it('groups remote locations together', () => {
        expect(getLocationRegion('Remote (US & Canada)')).toBe('Remote');
    });
});

describe('getDepartments / getLocationRegions', () => {
    it('returns unique sorted values', () => {
        expect(getDepartments(filterFixtures)).toEqual(['Finance', 'Sales', 'Technology']);
        expect(getLocationRegions(filterFixtures)).toEqual([
            'Canada',
            'Remote',
            'United Kingdom',
            'USA',
        ]);
    });

    it('returns empty arrays for no jobs', () => {
        expect(getDepartments([])).toEqual([]);
        expect(getLocationRegions([])).toEqual([]);
    });
});

describe('filterJobs', () => {
    it('filters by department only, supporting multiple selections', () => {
        expect(slugs(filterJobs(filterFixtures, { departments: ['Finance'], regions: [] }))).toEqual(['a', 'c']);
        expect(
            slugs(filterJobs(filterFixtures, { departments: ['Finance', 'Sales'], regions: [] })),
        ).toEqual(['a', 'c', 'd']);
    });

    it('filters by region only, supporting multiple selections', () => {
        expect(slugs(filterJobs(filterFixtures, { departments: [], regions: ['Remote'] }))).toEqual(['b']);
        expect(
            slugs(filterJobs(filterFixtures, { departments: [], regions: ['USA', 'Canada'] })),
        ).toEqual(['a', 'd']);
    });

    it('combines department and region with OR', () => {
        expect(
            slugs(filterJobs(filterFixtures, { departments: ['Sales'], regions: ['USA'] })),
        ).toEqual(['a', 'd']);
    });

    it('resets to the full list when nothing is selected', () => {
        expect(slugs(filterJobs(filterFixtures, { departments: [], regions: [] }))).toEqual([
            'a',
            'b',
            'c',
            'd',
        ]);
    });

    it('returns no roles for unknown selections or empty input', () => {
        expect(filterJobs(filterFixtures, { departments: ['Legal'], regions: ['Mars'] })).toEqual([]);
        expect(filterJobs([], { departments: ['Finance'], regions: [] })).toEqual([]);
    });

    it('does not mutate the input array', () => {
        const copy = [...filterFixtures];
        filterJobs(filterFixtures, { departments: [], regions: [] }).pop();
        expect(filterFixtures).toEqual(copy);
    });
});

describe('formatPostedDate', () => {
    it('formats an ISO date as a readable string', () => {
        expect(formatPostedDate('2027-01-05')).toBe('January 5, 2027');
    });

    it('returns the raw value when the date is unparseable', () => {
        expect(formatPostedDate('not-a-date')).toBe('not-a-date');
    });
});
