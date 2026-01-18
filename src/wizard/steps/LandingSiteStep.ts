/**
 * LandingSiteStep - Step 2 of Mission Design Wizard
 *
 * Redesigned with clear visual divisions:
 * - Snap settings at top
 * - Primary site section with dropdown
 * - Secondary site section (optional) with dropdown
 * - Dynamic legend
 */

import { MoonGlobeView } from '../components/MoonGlobeView.js';
import {
    PresetSite,
    loadPresetSites,
    getSnapDefaults,
    filterSitesByMission,
    checkSnap,
    formatCoordinates,
    isNearSide
} from '../components/SiteMarkers.js';

export interface SelectedSite {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    isPreset: boolean;
}

export interface LandingSiteStepState {
    primarySite: SelectedSite | null;
    backupSite: SelectedSite | null;
    addBackup: boolean;
    snapEnabled: boolean;
    snapRadius: number;
}

export interface LandingSiteStepOptions {
    container: HTMLElement;
    missionFilter?: 'cy2' | 'cy3' | 'all';
    initialState?: Partial<LandingSiteStepState>;
    onStateChange?: (state: LandingSiteStepState) => void;
}

export class LandingSiteStep {
    private container: HTMLElement;
    private globeContainer: HTMLElement | null = null;
    private moonGlobe: MoonGlobeView | null = null;

    private allSites: PresetSite[];
    private filteredSites: PresetSite[];
    private missionFilter: 'cy2' | 'cy3' | 'all';

    private state: LandingSiteStepState;
    private onStateChange?: (state: LandingSiteStepState) => void;

    // Current crosshair position
    private currentLat = -90;
    private currentLon = 0;
    private nearbySnap: { site: PresetSite; distance: number } | null = null;

    constructor(options: LandingSiteStepOptions) {
        this.container = options.container;
        this.missionFilter = options.missionFilter || 'all';
        this.onStateChange = options.onStateChange;

        // Load sites
        this.allSites = loadPresetSites();
        this.filteredSites = filterSitesByMission(this.allSites, this.missionFilter);

        // Initialize state
        const defaults = getSnapDefaults();
        this.state = {
            primarySite: null,
            backupSite: null,
            addBackup: false,
            snapEnabled: defaults.snapEnabled,
            snapRadius: defaults.snapRadiusDeg,
            ...options.initialState
        };

        this.render();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="landing-site-step">
                <div class="step-header">
                    <h2>Step 2: Landing Site Selection</h2>
                </div>

                <div class="landing-site-layout">
                    <div class="globe-section">
                        <div class="moon-globe-container" id="moon-globe-container"></div>
                        <div class="globe-controls-bar">
                            <div class="view-buttons">
                                <button class="view-btn active" data-view="south-pole">South Pole</button>
                                <button class="view-btn" data-view="north-pole">North Pole</button>
                                <button class="view-btn" data-view="front">Front (0°)</button>
                                <button class="view-btn" data-view="east">East (90°E)</button>
                                <button class="view-btn" data-view="back">Back (180°)</button>
                                <button class="view-btn" data-view="west">West (90°W)</button>
                            </div>
                            <span class="globe-instructions">Drag to rotate | Scroll to zoom</span>
                        </div>
                    </div>

                    <div class="controls-section">
                        <!-- Crosshair Info -->
                        <div class="crosshair-panel">
                            <div class="panel-label">Crosshair Position</div>
                            <div class="crosshair-coords" id="crosshair-coords">--</div>
                            <div class="crosshair-snap" id="crosshair-snap"></div>
                        </div>

                        <!-- Snap Settings -->
                        <div class="settings-panel">
                            <label class="toggle-row">
                                <input type="checkbox" id="snap-enabled-checkbox"
                                    ${this.state.snapEnabled ? 'checked' : ''} />
                                <span>Snap to nearby sites</span>
                                <select id="snap-radius-select" class="inline-select"
                                    ${!this.state.snapEnabled ? 'disabled' : ''}>
                                    <option value="1" ${this.state.snapRadius === 1 ? 'selected' : ''}>1°</option>
                                    <option value="2" ${this.state.snapRadius === 2 ? 'selected' : ''}>2°</option>
                                    <option value="5" ${this.state.snapRadius === 5 ? 'selected' : ''}>5°</option>
                                </select>
                            </label>
                        </div>

                        <!-- Step 2a: Primary Site Selection -->
                        <div id="primary-selection-panel" class="substep-panel active">
                            <div class="substep-header">
                                <span class="substep-label">2a</span>
                                <span class="substep-title">Primary Site</span>
                                <span class="section-badge required">Required</span>
                            </div>
                            <div class="substep-content">
                                <div class="selected-display" id="primary-display">
                                    ${this.state.primarySite
                                        ? `<span class="site-name">${this.state.primarySite.name}</span>
                                           <span class="site-coords">${formatCoordinates(this.state.primarySite.latitude, this.state.primarySite.longitude)}</span>`
                                        : '<span class="no-selection">Align crosshair with desired site</span>'}
                                </div>
                                <div class="substep-actions">
                                    <button id="set-primary-btn" class="action-btn primary-btn">Set</button>
                                    <button id="edit-primary-btn" class="action-btn" disabled>Edit</button>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2b: Backup Site Selection -->
                        <div id="backup-selection-panel" class="substep-panel">
                            <div class="substep-header">
                                <span class="substep-label">2b</span>
                                <span class="substep-title">Backup Site</span>
                                <span class="section-badge optional">Optional</span>
                            </div>
                            <div class="substep-content">
                                <div class="selected-display" id="backup-display">
                                    ${this.state.backupSite
                                        ? `<span class="site-name">${this.state.backupSite.name}</span>
                                           <span class="site-coords">${formatCoordinates(this.state.backupSite.latitude, this.state.backupSite.longitude)}</span>`
                                        : '<span class="no-selection">Align crosshair with backup site</span>'}
                                </div>
                                <div class="substep-actions">
                                    <button id="set-backup-btn" class="action-btn primary-btn">Set</button>
                                    <button id="edit-backup-btn" class="action-btn" disabled>Edit</button>
                                </div>
                            </div>
                        </div>

                        <!-- Legend -->
                        <div class="legend-panel">
                            <div class="panel-label">Site Markers</div>
                            <div class="legend-items" id="legend-items">
                                ${this.renderLegend()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.globeContainer = this.container.querySelector('#moon-globe-container');

        if (this.globeContainer) {
            this.moonGlobe = new MoonGlobeView({
                container: this.globeContainer,
                presetSites: this.filteredSites,
                onCrosshairMove: this.handleCrosshairMove.bind(this)
            });
            // Set initial view to South Pole (matches default active button)
            this.moonGlobe.setView(-90, 0);
        }

        this.attachEventListeners();
    }

    private renderLegend(): string {
        const legendItems = this.filteredSites.map(site => {
            const color = site.isActualLanding ? '#00ff88' : '#ffaa00';
            const isSelected = this.state.primarySite?.id === site.id ||
                              this.state.backupSite?.id === site.id;
            return `
                <div class="legend-item ${isSelected ? 'selected' : ''}"
                     data-site-id="${site.id}" title="${site.description}">
                    <span class="legend-color" style="background: ${color}"></span>
                    <span class="legend-name">${site.shortLabel}</span>
                </div>
            `;
        }).join('');

        return legendItems;
    }

    private updateLegend(): void {
        const legendContainer = this.container.querySelector('#legend-items');
        if (legendContainer) {
            legendContainer.innerHTML = this.renderLegend();
            // Re-attach legend click handlers
            legendContainer.querySelectorAll('.legend-item').forEach(item => {
                item.addEventListener('click', () => {
                    const siteId = item.getAttribute('data-site-id');
                    if (siteId) {
                        this.selectSiteById(siteId, 'primary');
                    }
                });
            });
        }
    }

    private attachEventListeners(): void {
        // Snap checkbox
        const snapCheckbox = this.container.querySelector('#snap-enabled-checkbox') as HTMLInputElement;
        const snapRadiusSelect = this.container.querySelector('#snap-radius-select') as HTMLSelectElement;

        snapCheckbox?.addEventListener('change', () => {
            this.state.snapEnabled = snapCheckbox.checked;
            snapRadiusSelect.disabled = !snapCheckbox.checked;
            this.notifyStateChange();
        });

        snapRadiusSelect?.addEventListener('change', () => {
            this.state.snapRadius = parseInt(snapRadiusSelect.value, 10);
            this.notifyStateChange();
        });

        // View buttons
        const viewButtons = this.container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                if (view && this.moonGlobe) {
                    // Update active state
                    viewButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Set view based on button
                    switch (view) {
                        case 'south-pole':
                            this.moonGlobe.setView(-90, 0);
                            break;
                        case 'north-pole':
                            this.moonGlobe.setView(90, 0);
                            break;
                        case 'front':
                            this.moonGlobe.setView(0, 0);
                            break;
                        case 'east':
                            this.moonGlobe.setView(0, 90);
                            break;
                        case 'back':
                            this.moonGlobe.setView(0, 180);
                            break;
                        case 'west':
                            this.moonGlobe.setView(0, -90);
                            break;
                    }
                }
            });
        });

        // Legend item clicks - toggle marker visibility
        this.container.querySelectorAll('.legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const siteId = item.getAttribute('data-site-id');
                if (siteId) {
                    this.toggleMarkerVisibility(siteId, item as HTMLElement);
                }
            });
        });

        // Set Primary button
        const setPrimaryBtn = this.container.querySelector('#set-primary-btn');
        setPrimaryBtn?.addEventListener('click', () => {
            this.selectFromCrosshair('primary');
            this.enableEditButton('primary');
            this.setSubStep('backup');
        });

        // Edit Primary button
        const editPrimaryBtn = this.container.querySelector('#edit-primary-btn');
        editPrimaryBtn?.addEventListener('click', () => {
            this.setSubStep('primary');
        });

        // Set Backup button
        const setBackupBtn = this.container.querySelector('#set-backup-btn');
        setBackupBtn?.addEventListener('click', () => {
            this.selectFromCrosshair('backup');
            this.enableEditButton('backup');
        });

        // Edit Backup button
        const editBackupBtn = this.container.querySelector('#edit-backup-btn');
        editBackupBtn?.addEventListener('click', () => {
            this.setSubStep('backup');
        });
    }

    private enableEditButton(target: 'primary' | 'backup'): void {
        const btnId = target === 'primary' ? '#edit-primary-btn' : '#edit-backup-btn';
        const btn = this.container.querySelector(btnId) as HTMLButtonElement;
        if (btn) {
            btn.disabled = false;
        }
    }

    private toggleMarkerVisibility(siteId: string, legendItem: HTMLElement): void {
        const isHidden = legendItem.classList.toggle('hidden');
        this.moonGlobe?.setMarkerVisibility(siteId, !isHidden);
    }

    private setSubStep(step: 'primary' | 'backup'): void {
        const primaryPanel = this.container.querySelector('#primary-selection-panel');
        const backupPanel = this.container.querySelector('#backup-selection-panel');

        if (step === 'primary') {
            primaryPanel?.classList.add('active');
            primaryPanel?.classList.remove('completed');
            backupPanel?.classList.remove('active');
        } else {
            primaryPanel?.classList.remove('active');
            primaryPanel?.classList.add('completed');
            backupPanel?.classList.add('active');
        }
    }

    private handleCrosshairMove(lat: number, lon: number): void {
        this.currentLat = lat;
        this.currentLon = lon;

        // Update coordinates display
        const coordsEl = this.container.querySelector('#crosshair-coords');
        if (coordsEl) {
            coordsEl.textContent = formatCoordinates(lat, lon);
        }

        // Check for snap
        const snapResult = checkSnap(
            lat, lon,
            this.filteredSites,
            this.state.snapRadius,
            this.state.snapEnabled
        );

        const snapEl = this.container.querySelector('#crosshair-snap');
        if (snapEl) {
            if (snapResult.snapped && snapResult.site) {
                this.nearbySnap = { site: snapResult.site, distance: snapResult.distance };
                snapEl.innerHTML = `<span class="snap-active">Snap: ${snapResult.site.shortLabel}</span>`;
            } else if (snapResult.site && snapResult.distance < 10) {
                this.nearbySnap = null;
                snapEl.innerHTML = `<span class="snap-nearby">Near: ${snapResult.site.shortLabel} (${snapResult.distance.toFixed(1)}°)</span>`;
            } else {
                this.nearbySnap = null;
                snapEl.innerHTML = '';
            }
        }
    }

    private selectSiteById(siteId: string, target: 'primary' | 'backup'): void {
        const site = this.filteredSites.find(s => s.id === siteId);
        if (!site) return;

        const selectedSite: SelectedSite = {
            id: site.id,
            name: site.name,
            latitude: site.latitude,
            longitude: site.longitude,
            isPreset: true
        };

        if (target === 'primary') {
            this.state.primarySite = selectedSite;
            this.updatePrimaryDisplay();
        } else {
            this.state.backupSite = selectedSite;
            this.updateBackupDisplay();
        }

        // Move globe to show the site
        this.moonGlobe?.lookAt(site.latitude, site.longitude);
        this.updateLegend();
        this.notifyStateChange();
    }

    private selectFromCrosshair(target: 'primary' | 'backup'): void {
        if (target === 'primary') {
            this.setPrimarySiteFromCrosshair();
        } else {
            this.setBackupSiteFromCrosshair();
        }
    }

    private setPrimarySiteFromCrosshair(): void {
        if (!isNearSide(this.currentLon)) {
            alert('Far side sites not supported (no direct Earth comms)');
            return;
        }

        if (this.nearbySnap) {
            this.selectSiteById(this.nearbySnap.site.id, 'primary');
        } else {
            this.state.primarySite = {
                id: `custom-${Date.now()}`,
                name: `Custom Site`,
                latitude: this.currentLat,
                longitude: this.currentLon,
                isPreset: false
            };
            this.updatePrimaryDisplay();
            this.updateLegend();
            this.notifyStateChange();
        }
    }

    private setBackupSiteFromCrosshair(): void {
        if (!isNearSide(this.currentLon)) {
            alert('Far side sites not supported (no direct Earth comms)');
            return;
        }

        if (this.nearbySnap) {
            this.selectSiteById(this.nearbySnap.site.id, 'backup');
        } else {
            this.state.backupSite = {
                id: `custom-${Date.now()}`,
                name: `Custom Site`,
                latitude: this.currentLat,
                longitude: this.currentLon,
                isPreset: false
            };
            this.updateBackupDisplay();
            this.updateLegend();
            this.notifyStateChange();
        }
    }

    private updatePrimaryDisplay(): void {
        const display = this.container.querySelector('#primary-display');
        if (display) {
            if (this.state.primarySite) {
                display.innerHTML = `
                    <span class="site-name">${this.state.primarySite.name}</span>
                    <span class="site-coords">${formatCoordinates(this.state.primarySite.latitude, this.state.primarySite.longitude)}</span>
                `;
            } else {
                display.innerHTML = '<span class="no-selection">Align crosshair with desired site</span>';
            }
        }
    }

    private updateBackupDisplay(): void {
        const display = this.container.querySelector('#backup-display');
        if (display) {
            if (this.state.backupSite) {
                display.innerHTML = `
                    <span class="site-name">${this.state.backupSite.name}</span>
                    <span class="site-coords">${formatCoordinates(this.state.backupSite.latitude, this.state.backupSite.longitude)}</span>
                `;
            } else {
                display.innerHTML = '<span class="no-selection">Align crosshair with backup site (optional)</span>';
            }
        }
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    /**
     * Set mission filter and update displayed sites
     */
    setMissionFilter(mission: 'cy2' | 'cy3' | 'all'): void {
        this.missionFilter = mission;
        this.filteredSites = filterSitesByMission(this.allSites, mission);
        this.moonGlobe?.setPresetSites(this.filteredSites);
        this.render();
    }

    /**
     * Get current state
     */
    getState(): LandingSiteStepState {
        return { ...this.state };
    }

    /**
     * Validate step (has at least primary site selected)
     */
    isValid(): boolean {
        return this.state.primarySite !== null;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.moonGlobe?.dispose();
        this.container.innerHTML = '';
    }
}
