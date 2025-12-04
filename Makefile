.PHONY: test test-unit test-e2e test-fast test-slow dev build lint clean

# Run all tests (unit + comprehensive E2E)
test:
	npm run test:release

# Run unit tests only
test-unit:
	npm test

# Run fast E2E tests only
test-e2e:
	npm run test:e2e:fast

# Run fast tests (unit + essential E2E) - good for CI
test-fast:
	npm run test:ci

# Run slow tests (unit + all E2E) - good for releases
test-slow:
	npm run test:release

# Start development server
dev:
	npm run dev

# Production build
build:
	npm run build

# Run linter
lint:
	npm run lint

# Clean build artifacts
clean:
	rm -rf dist dist-pages coverage
