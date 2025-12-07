# Nexus Plugin - Go Template Makefile

.PHONY: build test clean run lint fmt help

# Binary name
BINARY_NAME=nexus-plugin

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOCLEAN=$(GOCMD) clean
GOMOD=$(GOCMD) mod
GOFMT=gofmt
GOLINT=golangci-lint

# Build flags
LDFLAGS=-ldflags "-s -w"

## help: Show this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':'

## build: Build the plugin binary
build:
	$(GOBUILD) $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/plugin

## test: Run all tests
test:
	$(GOTEST) -v -race -cover ./...

## test-coverage: Run tests with coverage report
test-coverage:
	$(GOTEST) -v -race -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

## clean: Clean build artifacts
clean:
	$(GOCLEAN)
	rm -rf bin/
	rm -f coverage.out coverage.html

## run: Run the plugin
run: build
	./bin/$(BINARY_NAME)

## lint: Run linter
lint:
	$(GOLINT) run ./...

## fmt: Format code
fmt:
	$(GOFMT) -s -w .

## deps: Download dependencies
deps:
	$(GOMOD) download
	$(GOMOD) tidy

## validate: Validate manifest and schemas
validate:
	$(GOCMD) run ./cmd/validate

## docker: Build Docker image
docker:
	docker build -t nexus-plugin-go:latest .
