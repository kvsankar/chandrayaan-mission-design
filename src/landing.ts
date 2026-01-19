/**
 * Landing page entry point
 *
 * Minimal initialization for the landing page.
 * Handles any future analytics or interaction tracking.
 */

console.log('Chandrayaan-3 Mission Tools - Landing Page Loaded');

// Track card clicks for analytics (optional future enhancement)
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.app-card');

    cards.forEach((card) => {
        card.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLAnchorElement;
            const appName = target.querySelector('h2')?.textContent || 'Unknown';

            console.log(`User selected: ${appName}`);

            // Future: Send analytics event
            // trackEvent('app_selection', { app_name: appName });
        });
    });
});
