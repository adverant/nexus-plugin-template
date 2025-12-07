# Basic Calculator Plugin Template

A complete example plugin demonstrating core Nexus plugin development patterns using the PluginBuilder API.

## Features

- **Arithmetic Operations**: add, subtract, multiply, divide, power, sqrt, modulo
- **Unit Conversions**: length, weight, temperature, volume
- **Full Type Safety**: Zod schemas for input/output validation
- **MCP Integration**: Ready for Claude Code and other AI IDEs
- **Complete PID**: Plugin Intelligence Document with examples and error documentation

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run MCP server
npm start

# Development mode with hot reload
npm run dev
```

## Project Structure

```
src/
├── index.ts      # Plugin definition using PluginBuilder
├── schemas.ts    # Zod schemas for input/output
└── handlers.ts   # Business logic implementation
```

## Usage Examples

### Calculate

```typescript
// Simple addition
await calculate({ operation: 'add', a: 10, b: 5 });
// → { result: 15, expression: '10 + 5 = 15', precision: 2 }

// Division with precision
await calculate({ operation: 'divide', a: 22, b: 7, precision: 4 });
// → { result: 3.1429, expression: '22 ÷ 7 = 3.1429', precision: 4 }

// Square root
await calculate({ operation: 'sqrt', a: 16 });
// → { result: 4, expression: '√16 = 4', precision: 2 }
```

### Convert Units

```typescript
// Meters to feet
await convert_units({ value: 100, fromUnit: 'm', toUnit: 'ft', category: 'length' });
// → { originalValue: 100, convertedValue: 328.084, ... }

// Celsius to Fahrenheit
await convert_units({ value: 25, fromUnit: 'C', toUnit: 'F', category: 'temperature' });
// → { originalValue: 25, convertedValue: 77, ... }
```

## Supported Units

| Category | Units |
|----------|-------|
| Length | m, km, cm, mm, mi, ft, in, yd |
| Weight | kg, g, mg, lb, oz, t |
| Temperature | C, F, K |
| Volume | L, mL, gal, qt, pt, cup, fl_oz |

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Validate plugin
npm run validate
```

## Customization

1. Modify `src/schemas.ts` to add new operations or units
2. Implement handlers in `src/handlers.ts`
3. Register tools in `src/index.ts` using `.addTool()`
4. Update `nexus.manifest.json` with new tool metadata

## License

MIT
