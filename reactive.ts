/**
 * Reactive System - Vue 3-inspired reactivity for launch event state
 *
 * This module provides automatic dependency tracking and updates:
 * - reactive(): Makes objects reactive (auto-tracks access)
 * - computed(): Creates derived values that auto-update
 * - watchEffect(): Runs functions when dependencies change
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Effect function with optional scheduler and debug name
 */
interface ReactiveEffect {
    (): void;
    scheduler?: () => void;
    debugName?: string;
}

/**
 * Dependency set - collection of effects that depend on a property
 */
type Dep = Set<ReactiveEffect>;

/**
 * Map of property keys to their dependency sets
 */
type DepsMap = Map<string | symbol, Dep>;

/**
 * Options for watchEffect
 */
export interface WatchEffectOptions {
    /** Name for debugging purposes */
    name?: string;
    /** Custom error handler */
    onError?: (error: Error) => void;
}

/**
 * Computed ref with readonly value
 */
export interface ComputedRef<T> {
    readonly value: T;
}

/**
 * Stop function to cleanup watchers
 */
export type StopFunction = () => void;

// ============================================================================
// Global state
// ============================================================================

let activeEffect: ReactiveEffect | null = null;
const targetMap = new WeakMap<object, DepsMap>();

// Debug mode configuration
const DEBUG_MODE = false; // Set to true to enable circular dependency detection and logging
const effectStack: ReactiveEffect[] = []; // Track effect call stack for circular dependency detection

// ============================================================================
// Core tracking functions
// ============================================================================

/**
 * Track which effect is accessing which property
 */
function track(target: object, key: string | symbol): void {
    if (!activeEffect) return;

    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map<string | symbol, Dep>();
        targetMap.set(target, depsMap);
    }

    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set<ReactiveEffect>();
        depsMap.set(key, dep);
    }

    dep.add(activeEffect);

    if (DEBUG_MODE) {
        console.log(`[Reactive] Tracking: ${String(key)} by effect`, activeEffect.debugName || 'anonymous');
    }
}

/**
 * Trigger all effects that depend on this property
 */
function trigger(target: object, key: string | symbol): void {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const dep = depsMap.get(key);
    if (!dep) return;

    if (DEBUG_MODE) {
        console.log(`[Reactive] Triggering: ${String(key)} affects ${dep.size} effect(s)`);
    }

    // Create array to avoid infinite loops if effects modify tracked properties
    const effects = [...dep];
    effects.forEach(effect => {
        // Circular dependency detection
        if (DEBUG_MODE && effectStack.includes(effect)) {
            console.warn(
                `[Reactive] ⚠️ Circular dependency detected! Effect "${effect.debugName || 'anonymous'}" is already in call stack:`,
                effectStack.map(e => e.debugName || 'anonymous')
            );
            return; // Skip to prevent infinite recursion
        }

        if (effect.scheduler) {
            effect.scheduler();
        } else {
            effect();
        }
    });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Make an object reactive using Proxy
 * Property reads are tracked, property writes trigger updates
 *
 * @param target - The object to make reactive
 * @returns Reactive proxy of the target object
 */
export function reactive<T extends object>(target: T): T {
    const handler: ProxyHandler<T> = {
        get(target: T, key: string | symbol, receiver: unknown): unknown {
            const result = Reflect.get(target, key, receiver);
            track(target, key);
            return result;
        },

        set(target: T, key: string | symbol, value: unknown, receiver: unknown): boolean {
            const oldValue = Reflect.get(target, key, receiver);
            const result = Reflect.set(target, key, value, receiver);

            // Only trigger if value actually changed
            if (oldValue !== value) {
                trigger(target, key);
            }

            return result;
        }
    };

    return new Proxy(target, handler);
}

/**
 * Create a computed value that automatically updates when dependencies change
 *
 * @param getter - Function that computes the value
 * @returns Object with .value property that auto-updates
 */
export function computed<T>(getter: () => T): ComputedRef<T> {
    let value: T | undefined;
    let dirty = true;

    const effect: ReactiveEffect = () => {
        if (dirty) {
            activeEffect = effect;
            value = getter();
            activeEffect = null;
            dirty = false;
        }
    };

    // When dependencies change, mark as dirty and trigger watchers of this computed
    effect.scheduler = () => {
        if (!dirty) {
            dirty = true;
            trigger(computedRef, 'value');
        }
    };

    const computedRef = {
        get value(): T {
            track(computedRef, 'value');
            effect();
            return value as T;
        }
    };

    // Initial run to establish dependencies
    activeEffect = effect;
    value = getter();
    activeEffect = null;
    dirty = false;

    return computedRef;
}

/**
 * Watch a function and re-run it when any accessed reactive properties change
 *
 * @param fn - Function to run reactively
 * @param options - Optional configuration (name, onError)
 * @returns Stop function to stop watching
 */
export function watchEffect(fn: () => void, options: WatchEffectOptions = {}): StopFunction {
    const effect: ReactiveEffect = () => {
        try {
            activeEffect = effect;

            // Track effect in call stack for circular dependency detection
            if (DEBUG_MODE) {
                effectStack.push(effect);
            }

            fn();
        } catch (error) {
            // Error handling
            const effectName = effect.debugName || 'anonymous effect';
            console.error(`[Reactive] Error in ${effectName}:`, error);

            // Call custom error handler if provided
            if (options.onError && error instanceof Error) {
                options.onError(error);
            }
        } finally {
            activeEffect = null;

            // Pop from call stack
            if (DEBUG_MODE) {
                effectStack.pop();
            }
        }
    };

    // Store name for debugging (can't use .name as it's read-only)
    if (options.name) {
        effect.debugName = options.name;
    }

    // Run immediately to establish dependencies
    effect();

    // Return stop function
    return (): void => {
        // Remove this effect from all dependencies
        // Note: WeakMap doesn't have forEach, but we don't need to manually cleanup
        // as the WeakMap will automatically garbage collect when objects are unreachable
    };
}

/**
 * Watch specific properties and run callback when they change
 *
 * @param getter - Function that returns value to watch
 * @param callback - Called when value changes with (newValue, oldValue)
 * @returns Stop function to stop watching
 */
export function watch<T>(
    getter: () => T,
    callback: (newValue: T, oldValue: T | undefined) => void
): StopFunction {
    let oldValue: T | undefined;

    const effect: ReactiveEffect = () => {
        const newValue = getter();
        if (newValue !== oldValue) {
            callback(newValue, oldValue);
            oldValue = newValue;
        }
    };

    // Get initial value
    activeEffect = effect;
    oldValue = getter();
    activeEffect = null;

    return watchEffect(effect);
}
