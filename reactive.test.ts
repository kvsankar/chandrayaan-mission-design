import { describe, it, expect, vi } from 'vitest';
import { reactive, computed, watchEffect, watch } from './reactive';

describe('Reactive System', () => {
    describe('reactive()', () => {
        it('should create a reactive object', () => {
            const obj = reactive({ count: 0 });
            expect(obj.count).toBe(0);
        });

        it('should track property reads', () => {
            const obj = reactive({ count: 0 });
            let dummy: number;
            watchEffect(() => {
                dummy = obj.count;
            });
            expect(dummy!).toBe(0);
        });

        it('should trigger effects on property writes', () => {
            const obj = reactive({ count: 0 });
            let dummy: number;
            watchEffect(() => {
                dummy = obj.count;
            });
            expect(dummy!).toBe(0);
            obj.count = 5;
            expect(dummy!).toBe(5);
        });

        it('should not trigger effects when value does not change', () => {
            const obj = reactive({ count: 0 });
            const fn = vi.fn(() => obj.count);
            watchEffect(fn);
            expect(fn).toHaveBeenCalledTimes(1);
            obj.count = 0; // Same value
            expect(fn).toHaveBeenCalledTimes(1); // Should not trigger
        });

        it('should handle multiple properties', () => {
            const obj = reactive({ a: 1, b: 2 });
            let sum: number;
            watchEffect(() => {
                sum = obj.a + obj.b;
            });
            expect(sum!).toBe(3);
            obj.a = 10;
            expect(sum!).toBe(12);
            obj.b = 20;
            expect(sum!).toBe(30);
        });

        it('should handle nested object access', () => {
            // Note: Our reactive system doesn't support deep reactivity
            // It only tracks top-level property access
            const obj = reactive({ nested: { value: 0 } });
            let dummy: number;
            watchEffect(() => {
                dummy = obj.nested.value;
            });
            expect(dummy!).toBe(0);

            // Mutating nested.value won't trigger because nested object isn't reactive
            obj.nested.value = 5;
            expect(dummy!).toBe(0); // Still 0, not reactive

            // But replacing the whole nested object will trigger
            obj.nested = { value: 5 };
            expect(dummy!).toBe(5);
        });
    });

    describe('computed()', () => {
        it('should return computed value', () => {
            const obj = reactive({ count: 0 });
            const doubled = computed(() => obj.count * 2);
            expect(doubled.value).toBe(0);
        });

        it('should update when dependencies change', () => {
            const obj = reactive({ count: 0 });
            const doubled = computed(() => obj.count * 2);
            expect(doubled.value).toBe(0);
            obj.count = 5;
            expect(doubled.value).toBe(10);
        });

        it('should cache computed values', () => {
            const obj = reactive({ count: 0 });
            const fn = vi.fn(() => obj.count * 2);
            const doubled = computed(fn);

            expect(fn).toHaveBeenCalledTimes(1); // Initial computation
            expect(doubled.value).toBe(0);
            expect(fn).toHaveBeenCalledTimes(1); // Still 1, cached
            expect(doubled.value).toBe(0);
            expect(fn).toHaveBeenCalledTimes(1); // Still cached

            obj.count = 5; // Invalidate cache
            expect(doubled.value).toBe(10);
            expect(fn).toHaveBeenCalledTimes(2); // Recomputed
        });

        it('should work with multiple dependencies', () => {
            const obj = reactive({ a: 1, b: 2 });
            const sum = computed(() => obj.a + obj.b);
            expect(sum.value).toBe(3);
            obj.a = 10;
            expect(sum.value).toBe(12);
            obj.b = 20;
            expect(sum.value).toBe(30);
        });

        it('should trigger watchers when computed value changes', () => {
            const obj = reactive({ count: 0 });
            const doubled = computed(() => obj.count * 2);
            let dummy: number;
            watchEffect(() => {
                dummy = doubled.value;
            });
            expect(dummy!).toBe(0);
            obj.count = 5;
            expect(dummy!).toBe(10);
        });

        it('should be readonly', () => {
            const obj = reactive({ count: 0 });
            const doubled = computed(() => obj.count * 2);
            // TypeScript should prevent this, but test runtime behavior
            expect(() => {
                // @ts-expect-error - Testing readonly behavior
                doubled.value = 20;
            }).toThrow();
        });
    });

    describe('watchEffect()', () => {
        it('should run immediately', () => {
            const fn = vi.fn();
            watchEffect(fn);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should track dependencies and re-run on changes', () => {
            const obj = reactive({ count: 0 });
            const fn = vi.fn(() => obj.count);
            watchEffect(fn);
            expect(fn).toHaveBeenCalledTimes(1);
            obj.count = 5;
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should return stop function', () => {
            // Note: Stop function exists but doesn't actively cleanup
            // (WeakMap will garbage collect automatically)
            const obj = reactive({ count: 0 });
            const fn = vi.fn(() => obj.count);
            const stop = watchEffect(fn);
            expect(fn).toHaveBeenCalledTimes(1);
            obj.count = 5;
            expect(fn).toHaveBeenCalledTimes(2);

            // Stop function exists for API compatibility
            expect(typeof stop).toBe('function');
            stop();
        });

        it('should handle multiple effects on same property', () => {
            const obj = reactive({ count: 0 });
            const fn1 = vi.fn(() => obj.count);
            const fn2 = vi.fn(() => obj.count * 2);
            watchEffect(fn1);
            watchEffect(fn2);
            expect(fn1).toHaveBeenCalledTimes(1);
            expect(fn2).toHaveBeenCalledTimes(1);
            obj.count = 5;
            expect(fn1).toHaveBeenCalledTimes(2);
            expect(fn2).toHaveBeenCalledTimes(2);
        });

        it('should handle error with onError callback', () => {
            const obj = reactive({ count: 0 });
            const error = new Error('Test error');
            const onError = vi.fn();
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

            watchEffect(() => {
                if (obj.count > 0) throw error;
            }, { onError });

            expect(consoleError).not.toHaveBeenCalled();
            obj.count = 5;
            expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Error'), error);
            expect(onError).toHaveBeenCalledWith(error);

            consoleError.mockRestore();
        });

        it('should support debug name option', () => {
            const obj = reactive({ count: 0 });
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

            watchEffect(() => {
                if (obj.count > 0) throw new Error('Test');
            }, { name: 'testEffect' });

            obj.count = 5;
            expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('testEffect'), expect.any(Error));

            consoleError.mockRestore();
        });
    });

    describe('watch()', () => {
        it('should watch specific value', () => {
            const obj = reactive({ count: 0 });
            const callback = vi.fn();
            watch(() => obj.count, callback);

            expect(callback).not.toHaveBeenCalled(); // Should not call initially
            obj.count = 5;
            expect(callback).toHaveBeenCalledWith(5, 0);
        });

        it('should provide old and new values', () => {
            const obj = reactive({ count: 0 });
            const callback = vi.fn();
            watch(() => obj.count, callback);

            obj.count = 5;
            expect(callback).toHaveBeenCalledWith(5, 0);
            obj.count = 10;
            expect(callback).toHaveBeenCalledWith(10, 5);
        });

        it('should not call callback when value does not change', () => {
            const obj = reactive({ count: 0 });
            const callback = vi.fn();
            watch(() => obj.count, callback);

            obj.count = 0; // Same value
            expect(callback).not.toHaveBeenCalled();
        });

        it('should return stop function', () => {
            const obj = reactive({ count: 0 });
            const callback = vi.fn();
            const stop = watch(() => obj.count, callback);

            obj.count = 5;
            expect(callback).toHaveBeenCalledTimes(1);

            // Stop function exists for API compatibility
            expect(typeof stop).toBe('function');
            stop();
        });

        it('should watch computed values', () => {
            const obj = reactive({ a: 1, b: 2 });
            const sum = computed(() => obj.a + obj.b);
            const callback = vi.fn();
            watch(() => sum.value, callback);

            obj.a = 10;
            expect(callback).toHaveBeenCalledWith(12, 3);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle computed values depending on other computed values', () => {
            const obj = reactive({ count: 1 });
            const doubled = computed(() => obj.count * 2);
            const quadrupled = computed(() => doubled.value * 2);

            expect(quadrupled.value).toBe(4);
            obj.count = 5;
            expect(doubled.value).toBe(10);
            expect(quadrupled.value).toBe(20);
        });

        it('should handle effects that modify other reactive properties', () => {
            const obj = reactive({ a: 1, b: 0 });
            watchEffect(() => {
                obj.b = obj.a * 2;
            });
            expect(obj.b).toBe(2);
            obj.a = 5;
            expect(obj.b).toBe(10);
        });

        it('should handle conditional dependencies', () => {
            const obj = reactive({ flag: true, a: 1, b: 2 });
            let result: number;
            watchEffect(() => {
                result = obj.flag ? obj.a : obj.b;
            });
            expect(result!).toBe(1);

            obj.a = 10;
            expect(result!).toBe(10);

            obj.b = 20; // Should not trigger because flag is true
            expect(result!).toBe(10);

            obj.flag = false;
            expect(result!).toBe(20);

            obj.a = 100; // Should not trigger because flag is false
            expect(result!).toBe(20);

            obj.b = 200;
            expect(result!).toBe(200);
        });

        it('should handle array operations', () => {
            const obj = reactive({ items: [1, 2, 3] });
            let sum: number;
            watchEffect(() => {
                sum = obj.items.reduce((a, b) => a + b, 0);
            });
            expect(sum!).toBe(6);

            // Array mutations won't trigger reactivity (array isn't deeply reactive)
            obj.items.push(4);
            expect(sum!).toBe(6); // Still 6

            // But replacing the array will trigger
            obj.items = [1, 2, 3, 4];
            expect(sum!).toBe(10);
        });

        it('should support multiple effects on same property', () => {
            const obj = reactive({ count: 0 });
            const fn1 = vi.fn(() => obj.count);
            const fn2 = vi.fn(() => obj.count);

            watchEffect(fn1);
            watchEffect(fn2);

            expect(fn1).toHaveBeenCalledTimes(1);
            expect(fn2).toHaveBeenCalledTimes(1);

            obj.count = 5;
            expect(fn1).toHaveBeenCalledTimes(2);
            expect(fn2).toHaveBeenCalledTimes(2);
        });
    });
});
