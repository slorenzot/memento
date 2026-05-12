# Paquete CLI

`@slorenzot/memento-cli` — interfaz de línea de comandos para gestión de memoria desde la terminal.

## Instalación

```bash
bun add -g @slorenzot/memento-cli
```

## Binario

```bash
memento <comando> [opciones]
```

## Arquitectura

Construido sobre `@slorenzot/memento-core`, el CLI provee una capa de comandos que mapea argumentos CLI a métodos del engine.

```
CLI (src/index.ts)
  ├── Comandos → llamadas a métodos del engine
  ├── Formato de output → display amigable para terminal
  └── Opciones globales → --project, --db, --help
```

## Ver también

- [Referencia CLI](/es/docs/cli/reference) — todos los comandos y opciones
- [Paquete Core](/es/docs/packages/core) — engine subyacente
