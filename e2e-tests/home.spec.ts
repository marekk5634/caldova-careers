import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Derive the expected posting count from the job content collection so this
// assertion stays correct as roles are added or removed.
const jobsDir = fileURLToPath(new URL('../src/content/jobs', import.meta.url));
const expectedRoleCount = readdirSync(jobsDir).filter((f) => f.endsWith('.md')).length;

test.describe('Open roles listing', () => {
    test('shows the roles grid with all postings', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Open roles' })).toBeVisible();

        const grid = page.getByTestId('roles-grid');
        await expect(grid).toBeVisible();
        await expect(page.getByTestId('role-card')).toHaveCount(expectedRoleCount);
    });

    test('links through to a role detail page', async ({ page }) => {
        await page.goto('/');
        const firstCard = page.getByTestId('role-card').first();
        const title = await firstCard.getByTestId('role-title').textContent();
        await firstCard.click();
        await expect(page.getByTestId('role-detail-title')).toHaveText(title!.trim());
        await expect(page.getByTestId('apply-form')).toBeVisible();
    });

    for (const { title, location } of [
        { title: 'Senior Frontend Engineer', location: 'Remote (US & Canada)' },
        { title: 'Financial Analyst', location: 'Woodinville, WA, USA' },
    ]) {
        test(`shows ${title} location on the card and details`, async ({ page }) => {
            await page.goto('/');
            const card = page.getByTestId('role-card').filter({
                has: page.getByRole('heading', { name: title, exact: true }),
            });

            await expect(card).toBeVisible();
            await expect(card.getByTestId('role-location')).toHaveText(location);
            await card.click();
            await expect(page.getByText(location, { exact: true })).toBeVisible();
        });
    }

    test('has no automatically detectable accessibility violations', async ({ page }) => {
        await page.goto('/');
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
});

test.describe('Role filters', () => {
    /** Locate all role cards on the page. */
    const cards = (page: import('@playwright/test').Page) => page.locator('[data-testid="role-card"]');
    /** Locate a filter checkbox by group ("department" or "location") and label. */
    const option = (page: import('@playwright/test').Page, group: string, name: string) =>
        page.getByTestId(`${group}-filter`).getByRole('checkbox', { name, exact: true });

    test('filters by department, location, and a combination', async ({ page }) => {
        await page.goto('/');

        await test.step('department only', async () => {
            await option(page, 'department', 'Finance').check();
            await expect(cards(page).and(page.locator(':visible'))).toHaveCount(2);
            await expect(page.getByTestId('results-count')).toContainText('Showing 2 of');
        });

        await test.step('multiple departments', async () => {
            await option(page, 'department', 'Marketing').check();
            await expect(cards(page).and(page.locator(':visible'))).toHaveCount(3);
        });

        await test.step('reset, then location only', async () => {
            await page.getByTestId('filters-reset').click();
            await expect(cards(page).and(page.locator(':visible'))).toHaveCount(expectedRoleCount);
            await option(page, 'location', 'Remote').check();
            await expect(cards(page).and(page.locator(':visible'))).toHaveCount(2);
        });

        await test.step('department OR location', async () => {
            await option(page, 'department', 'Marketing').check();
            await expect(cards(page).and(page.locator(':visible'))).toHaveCount(3);
        });
    });

    test('resets filters and has accessible controls', async ({ page }) => {
        await page.goto('/');
        await option(page, 'department', 'Finance').check();
        await page.getByTestId('filters-reset').click();
        await expect(option(page, 'department', 'Finance')).not.toBeChecked();
        await expect(cards(page).and(page.locator(':visible'))).toHaveCount(expectedRoleCount);
        await expect(page.getByTestId('empty-state')).toBeHidden();
    });
});
