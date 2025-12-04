/**
 * Event Bus - Observer pattern for decoupled state management
 *
 * This replaces the reactive system with a simple, explicit event-based approach.
 * Subscribers register once at initialization, setters emit events, and the bus
 * handles notification without any hidden side effects or circular dependencies.
 */

type EventCallback = (data?: any) => void;

/**
 * Simple event bus implementation
 *
 * Usage:
 *   // Subscribe to events
 *   events.on('launchEvent:raan', ({ raan }) => {
 *       updateVisualization();
 *   });
 *
 *   // Emit events
 *   events.emit('launchEvent:raan', { raan: 45 });
 */
class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    /**
     * Subscribe to an event
     * @param event Event name
     * @param callback Function to call when event fires
     * @returns Unsubscribe function
     */
    on(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    /**
     * Emit an event to all subscribers
     * @param event Event name
     * @param data Data to pass to subscribers
     */
    emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param event Event name
     */
    clear(event: string): void {
        this.listeners.delete(event);
    }

    /**
     * Remove all listeners
     */
    clearAll(): void {
        this.listeners.clear();
    }

    /**
     * Get count of listeners for an event (useful for debugging)
     * @param event Event name
     * @returns Number of listeners
     */
    getListenerCount(event: string): number {
        return this.listeners.get(event)?.size ?? 0;
    }
}

// Global event bus instance
export const events = new EventBus();

// Event type definitions for type safety (can be expanded as needed)
export type LaunchEventEvents = {
    'launchEvent:raan': { raan: number };
    'launchEvent:apogeeAlt': { apogeeAlt: number };
    'launchEvent:perigeeAlt': { perigeeAlt: number };
    'launchEvent:inclination': { inclination: number };
    'launchEvent:omega': { omega: number };
    'launchEvent:trueAnomaly': { trueAnomaly: number };
    'launchEvent:date': { date: Date };
    'launchEvent:moonInterceptDate': { moonInterceptDate: Date };
    'launchEvent:syncTLIWithLOI': { syncTLIWithLOI: boolean };
    'launchEvent:optimized': { raan: number; apogeeAlt: number };
    'launchEvent:created': Record<string, never>;
    'launchEvent:deleted': Record<string, never>;
};
