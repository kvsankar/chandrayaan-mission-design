/**
 * Landing page entry point
 *
 * Loads configuration and dynamically populates the landing page content.
 */

import landingConfig from './landing-config.json';

interface AppConfig {
    id: string;
    url: string;
    icon: string;
    title: string;
    description: string;
    features: string[];
    cta: string;
    featured: boolean;
}

interface LandingConfig {
    hero: {
        title: string;
        subtitle: string;
    };
    apps: AppConfig[];
    footer: {
        text: string;
        github: {
            text: string;
            url: string;
        };
    };
}

const config = landingConfig as LandingConfig;

console.log('Chandrayaan-3 Mission Tools - Landing Page Loaded');

// Populate page content from configuration
document.addEventListener('DOMContentLoaded', () => {
    populateHero();
    populateAppCards();
    populateFooter();
    setupAnalytics();
});

function populateHero(): void {
    const titleEl = document.querySelector('.hero h1');
    const subtitleEl = document.querySelector('.hero .subtitle');

    if (titleEl) titleEl.textContent = config.hero.title;
    if (subtitleEl) subtitleEl.textContent = config.hero.subtitle;

    // Update page title as well
    document.title = config.hero.title;
}

function populateAppCards(): void {
    const container = document.querySelector('.app-cards');
    if (!container) return;

    // Clear existing cards
    container.innerHTML = '';

    // Generate cards from configuration
    config.apps.forEach((app) => {
        const card = createAppCard(app);
        container.appendChild(card);
    });
}

function createAppCard(app: AppConfig): HTMLElement {
    const card = document.createElement('a');
    card.href = app.url;
    card.className = app.featured ? 'app-card featured' : 'app-card';

    // Icon
    const icon = document.createElement('div');
    icon.className = 'card-icon';
    icon.textContent = app.icon;
    card.appendChild(icon);

    // Title
    const title = document.createElement('h2');
    title.textContent = app.title;
    card.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'card-description';
    description.textContent = app.description;
    card.appendChild(description);

    // Features
    const features = document.createElement('div');
    features.className = app.features.length > 4 ? 'card-features' : 'card-features single-row';
    app.features.forEach((feature) => {
        const tag = document.createElement('span');
        tag.className = 'feature-tag';
        tag.textContent = feature;
        features.appendChild(tag);
    });
    card.appendChild(features);

    // Footer with CTA
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const cta = document.createElement('span');
    cta.className = 'card-cta';
    cta.textContent = app.cta;
    footer.appendChild(cta);
    card.appendChild(footer);

    return card;
}

function populateFooter(): void {
    const footerEl = document.querySelector('.landing-footer p');
    if (!footerEl) return;

    // Clear existing content
    footerEl.innerHTML = '';

    // Add footer text
    const text = document.createTextNode(config.footer.text);
    footerEl.appendChild(text);

    // Add line break
    footerEl.appendChild(document.createElement('br'));

    // Add GitHub link
    const githubLink = document.createElement('a');
    githubLink.href = config.footer.github.url;
    githubLink.target = '_blank';
    githubLink.rel = 'noopener';
    githubLink.textContent = config.footer.github.text;
    footerEl.appendChild(githubLink);
}

function setupAnalytics(): void {
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
}
