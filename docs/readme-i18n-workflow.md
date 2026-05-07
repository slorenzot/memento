# Workflow: Actualización de READMEs Multilingües antes de Release Estable

> **Trigger**: Antes de publicar cualquier versión estable (major o minor) de cualquier paquete `@slorenzot/memento-*`.
>
> **Idiomas soportados**: Inglés (`README.md`) + Español (`README.es.md`).

---

## Estado Actual

| Archivo | Idioma actual | Líneas | Estado |
|---------|---------------|--------|--------|
| `README.md` (root) | Español | 922 | Requiere migración a inglés + crear `.es.md` |
| `packages/core/README.md` | Mix EN/ES | 444 | Requiere migración a inglés + crear `.es.md` |
| `packages/mcp-server/README.md` | Mix EN/ES | 491 | Requiere migración a inglés + crear `.es.md` |
| `packages/cli/README.md` | Mix EN/ES | 422 | Requiere migración a inglés + crear `.es.md` |
| `packages/api/README.md` | Mix EN/ES | 590 | Requiere migración a inglés + crear `.es.md` |
| `packages/web-ui/README.md` | Mix EN/ES | 650 | Requiere migración a inglés + crear `.es.md` |

---

## Convención de Archivos

```
memento/
├── README.md              # Inglés (idioma principal, estándar OSS)
├── README.es.md           # Español (traducción completa)
├── packages/
│   ├── core/
│   │   ├── README.md      # Inglés
│   │   └── README.es.md   # Español
│   ├── mcp-server/
│   │   ├── README.md      # Inglés
│   │   └── README.es.md   # Español
│   ├── cli/
│   │   ├── README.md      # Inglés
│   │   └── README.es.md   # Español
│   ├── api/
│   │   ├── README.md      # Inglés
│   │   └── README.es.md   # Español
│   └── web-ui/
│       ├── README.md      # Inglés
│       └── README.es.md   # Español
```

**Regla**: `README.md` SIEMPRE es inglés. `README.es.md` SIEMPRE es español. Sin excepciones.

---

## Estructura Obligatoria de Secciones

Cada README (ambos idiomas) DEBE contener estas secciones en este orden:

```
1. Header (nombre del paquete + badges)
2. Descripción corta (blockquote)
3. Instalación
4. Uso Básico
5. API / Comandos / Herramientas (según paquete)
6. Configuración (si aplica)
7. Ejemplos de Uso
8. Desarrollo (solo root y contribuciones)
9. Testing
10. Licencia
11. Autor
```

### Secciones por Paquete

| Paquete | Secciones Específicas |
|---------|----------------------|
| Root | Arquitectura + Roadmap + Agradecimientos + Todos los paquetes |
| core | API MemoryEngine + tipos + schema SQL |
| mcp-server | 15 herramientas MCP + configuración de clientes + skill installation |
| cli | Todos los comandos con ejemplos + flags + outputs |
| api | Endpoints REST + ejemplos curl + autenticación |
| web-ui | Componentes + hooks + stack tecnológico |

---

## Checklist Pre-Release: READMEs Multilingües

Ejecutar este checklist COMPLETO antes de `npm publish` / `bun publish` de cualquier paquete.

### Fase 1: Consistencia de Versiones

- [ ] **1.1** Versiones en `package.json` coinciden con versiones en README.md (badges NPM, sección de paquetes, footer)
- [ ] **1.2** Versiones en `README.es.md` coinciden con `README.md` (ambos reflejan la misma versión)
- [ ] **1.3** Badge de NPM version apunta al paquete correcto:
  ```markdown
  [![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-core.svg)]
  ```
- [ ] **1.4** Si es root: la tabla de "Paquetes NPM" y el footer tienen todas las versiones actualizadas

### Fase 2: Consistencia de Contenido entre Idiomas

- [ ] **2.1** `README.md` (EN) y `README.es.md` (ES) tienen las MISMAS secciones en el MISMO orden
- [ ] **2.2** No hay secciones "huérfanas" — secciones que existen en un idioma pero no en el otro
- [ ] **2.3** Los code snippets/blocks son IDÉNTICOS en ambos idiomas (código no se traduce)
- [ ] **2.4** Las URLs, badges y links son idénticos y funcionales en ambos idiomas
- [ ] **2.5** Los ejemplos de CLI output son idénticos (el output del programa no cambia por idioma del README)

### Fase 3: Precisión Técnica

- [ ] **3.1** Número de herramientas MCP documentadas coincide con la implementación real (actualmente 15+ herramientas, verificar `packages/mcp-server/src/`)
- [ ] **3.2** Lista de endpoints API coincide con las rutas implementadas
- [ ] **3.3** Comandos CLI documentados coinciden con los comandos registrados en `commander`
- [ ] **3.4** Tipos TypeScript documentados coinciden con las interfaces en `packages/core/src/types.ts`
- [ ] **3.5** Arquitectura diagram es consistente con la estructura actual del monorepo

### Fase 4: Calidad de Traducción

- [ ] **4.1** README.md está en inglés correcto y natural (no es "Spanglish" ni traducción literal)
- [ ] **4.2** README.es.md está en español correcto y natural
- [ ] **4.3** Términos técnicos consistentes:
  - No traducir: "MCP", "SQLite", "FTS5", "BM25", "UUID", "API", "CLI", "REST"
  - Traducir: "observaciones" (ES) / "observations" (EN), "sesiones" / "sessions", "búsqueda" / "search"
- [ ] **4.4** Los bloques de código usan comentarios en el idioma del README:

  ```typescript
  // README.md (English)
  // Initialize memory engine
  const memory = new MemoryEngine('./data/memento.db');
  ```

  ```typescript
  // README.es.md (Spanish)
  // Inicializar motor de memoria
  const memory = new MemoryEngine('./data/memento.db');
  ```

### Fase 5: Cross-References y Navegación

- [ ] **5.1** Cada paquete README tiene un link al README root y a los otros paquetes
- [ ] **5.2** El README root tiene links a TODOS los paquetes con sus versiones
- [ ] **5.3** Los links de NPM apuntan a las URLs correctas (`https://www.npmjs.com/package/@slorenzot/memento-*`)
- [ ] **5.4** Ambos idiomas tienen los mismos links de navegación

### Fase 6: Idioma como Source of Truth

- [ ] **6.1** El idioma INGLÉS (`README.md`) es el source of truth — cambios nuevos van PRIMERO en inglés
- [ ] **6.2** `README.es.md` se actualiza DESPUÉS de que `README.md` esté aprobado
- [ ] **6.3** Si hay discrepancia, `README.md` (EN) gana — corregir `README.es.md`

---

## Proceso Paso a Paso

### Paso 0: Setup Inicial (UNA SOLA VEZ — antes del primer release)

```
┌──────────────────────────────────────────────────────┐
│  PASO 0: MIGRACIÓN INICIAL                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Copiar README.md actual → README.es.md           │
│     (el español actual se convierte en la            │
│      versión traducida)                              │
│                                                      │
│  2. Crear nuevo README.md en INGLÉS                  │
│     (traducir el contenido del español actual)       │
│                                                      │
│  3. Repetir para cada paquete:                       │
│     - packages/core/README.md → EN                   │
│     - packages/core/README.es.md → ES                │
│     - packages/mcp-server/README.md → EN             │
│     - packages/mcp-server/README.es.md → ES          │
│     - packages/cli/README.md → EN                    │
│     - packages/cli/README.es.md → ES                 │
│     - packages/api/README.md → EN                    │
│     - packages/api/README.es.md → ES                 │
│     - packages/web-ui/README.md → EN                 │
│     - packages/web-ui/README.es.md → ES              │
│                                                      │
│  4. Ejecutar checklist completo (Fases 1-6)          │
│                                                      │
│  5. Commit + PR: "docs: migrate READMEs to EN+ES"   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Nota sobre la migración**: El contenido actual de los READMEs está en español. El proceso de migración consiste en:
1. El español actual se PRESERVA como `README.es.md`
2. Se crea un nuevo `README.md` en inglés como traducción del español
3. NO se pierde nada — el español pasa a ser la variante `.es.md`

### Paso 1: Antes de Cada Release

```
┌──────────────────────────────────────────────────────┐
│  PASO 1: ACTUALIZAR VERSIONES                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Actualizar package.json del paquete a liberar    │
│                                                      │
│  2. Buscar en README.md (EN) todas las               │
│     referencias a versiones anteriores:              │
│     - Badges NPM                                     │
│     - Tabla de paquetes (si es root)                 │
│     - Footer con versiones (si es root)              │
│     - Referencias en texto ("v0.7.0")               │
│                                                      │
│  3. Actualizar a la nueva versión                    │
│                                                      │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  PASO 2: SINCRONIZAR README.es.md                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Replicar en README.es.md los mismos cambios      │
│     de versión que se hicieron en README.md          │
│                                                      │
│  2. Verificar que ambas versiones coinciden          │
│                                                      │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  PASO 3: VERIFICAR NUEVAS FUNCIONALIDADES            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Si el release agrega funcionalidades nuevas:     │
│     - Documentar en README.md (EN) PRIMERO          │
│     - Luego traducir a README.es.md (ES)            │
│                                                      │
│  2. Si el release modifica API existente:            │
│     - Actualizar ejemplos de código en AMBOS        │
│     - Actualizar tipos/interfaces en AMBOS          │
│     - Actualizar outputs de CLI en AMBOS            │
│                                                      │
│  3. Si el release elimina funcionalidades:           │
│     - Remover de AMBOS READMEs                      │
│     - Agregar nota de breaking change si aplica      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Paso 2: Ejecutar Checklist de Calidad

```
┌──────────────────────────────────────────────────────┐
│  PASO 4: EJECUTAR CHECKLIST COMPLETO                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Ejecutar las 6 fases del checklist de arriba:       │
│                                                      │
│  Fase 1: Consistencia de versiones       (4 items)  │
│  Fase 2: Consistencia entre idiomas      (5 items)  │
│  Fase 3: Precisión técnica               (5 items)  │
│  Fase 4: Calidad de traducción           (4 items)  │
│  Fase 5: Cross-references                (4 items)  │
│  Fase 6: Source of truth                 (3 items)  │
│                                                      │
│  Total: 25 verificaciones                             │
│  Todas deben pasar antes de publish                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Paso 3: Commit y Publish

```
┌──────────────────────────────────────────────────────┐
│  PASO 5: COMMIT + PUBLISH                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Crear Issue en GitHub:                           │
│     "docs: update READMEs for v{version} release"    │
│                                                      │
│  2. Crear branch:                                    │
│     docs/{issue}-readme-v{version}                   │
│                                                      │
│  3. Commit con mensaje:                              │
│     docs(readme): update EN+ES for v{version}        │
│                                                      │
│  4. PR contra develop con:                           │
│     - Descripción de cambios en documentación        │
│     - "Closes #{issue}"                              │
│                                                      │
│  5. Después de merge: publish npm                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Verificación Rápida por Comando

Para verificar que los READMEs están sincronizados sin leerlos completos:

```bash
# 1. Verificar que ambos archivos existen
ls -la README.md README.es.md
ls -la packages/*/README.md packages/*/README.es.md

# 2. Verificar que las secciones coinciden (extraer headers)
grep "^##" README.md > /tmp/en-sections.txt
grep "^##" README.es.md > /tmp/es-sections.txt
diff /tmp/en-sections.txt /tmp/es-sections.txt
# Debería mostrar solo diferencias de texto, mismo número de líneas

# 3. Verificar versiones en ambos archivos
grep -oP 'v?\d+\.\d+\.\d+' README.md | sort | uniq
grep -oP 'v?\d+\.\d+\.\d+' README.es.md | sort | uniq
# Deben coincidir

# 4. Verificar que los code blocks son idénticos
# Extraer code blocks y comparar
sed -n '/^```/,/^```/p' README.md > /tmp/en-code.txt
sed -n '/^```/,/^```/p' README.es.md > /tmp/es-code.txt
diff /tmp/en-code.txt /tmp/es-code.txt
# Debería ser idéntico (código no se traduce)

# 5. Verificar links/badges
grep -oP 'https?://[^\s)\]]+' README.md | sort | uniq > /tmp/en-links.txt
grep -oP 'https?://[^\s)\]]+' README.es.md | sort | uniq > /tmp/es-links.txt
diff /tmp/en-links.txt /tmp/es-links.txt
# Deben coincidir
```

---

## Reglas de Traducción

### NO traducir (mantener en inglés en AMBOS idiomas)

- Nombres de paquetes: `@slorenzot/memento-core`
- Comandos CLI: `memento search`, `memento save`
- Nombres de herramientas MCP: `mem_save`, `mem_search`, `mem_health`
- Tecnologías: SQLite, FTS5, BM25, UUID, REST, MCP, WAL
- Tipos de observación: `decision`, `bug`, `discovery`, `note`
- Rutas de archivo: `~/.memento/data/memento.db`
- Variables de entorno: `MEMENTO_DB_PATH`, `MEMENTO_API_PORT`
- Nombres de clases/métodos: `MemoryEngine`, `createObservation`
- Nombres de archivos: `.mementorc`, `package.json`

### SÍ traducir

| Inglés (README.md) | Español (README.es.md) |
|---------------------|------------------------|
| Installation | Instalación |
| Quick Start | Inicio Rápido |
| Basic Usage | Uso Básico |
| Features | Características |
| Configuration | Configuración |
| Performance | Rendimiento |
| Development | Desarrollo |
| Testing | Testing (se mantiene) |
| License | Licencia |
| Author | Autor |
| Requirements | Requisitos Previos |
| Available Tools | Herramientas Disponibles |
| Examples | Ejemplos de Uso |
| Architecture | Arquitectura |
| Important | Importante |

### Comentarios en Código

Los comentarios dentro de bloques de código SÍ se traducen:

```typescript
// README.md (English)
const memory = new MemoryEngine('./data/memento.db');
// Create an observation
const obs = await memory.createObservation({ ... });
```

```typescript
// README.es.md (Spanish)
const memory = new MemoryEngine('./data/memento.db');
// Crear una observación
const obs = await memory.createObservation({ ... });
```

---

## Glosario de Términos del Proyecto

Términos específicos de Memento y cómo referirse a ellos en cada idioma:

| Concepto | README.md (EN) | README.es.md (ES) |
|----------|----------------|--------------------|
| observation | observation | observación |
| session | session | sesión |
| prompt | prompt | prompt (se mantiene) |
| topic key | topic key | topic key (se mantiene) |
| project ID | project ID | ID de proyecto |
| soft delete | soft delete | soft delete (se mantiene) |
| timeline | timeline | timeline (se mantiene) |
| health check | health check | health check (se mantiene) |
| memory engine | memory engine | motor de memoria |
| persistent memory | persistent memory | memoria persistente |
| AI coding agent | AI coding agent | agente de codificación IA |
| badge | badge | badge (se mantiene) |
| skill | skill | skill (se mantiene) |
| slash command | slash command | slash command (se mantiene) |

---

## Matriz de Responsabilidad por Release

| Tipo de Release | READMEs a Actualizar | Prioridad |
|-----------------|---------------------|-----------|
| `@slorenzot/memento-core` bump | Root + core | Alta |
| `@slorenzot/memento-mcp-server` bump | Root + mcp-server | Alta |
| `@slorenzot/memento-cli` bump | Root + cli | Media |
| `@slorenzot/memento-api` bump | Root + api | Media |
| `@slorenzot/memento-web-ui` bump | Root + web-ui | Media |
| Nueva funcionalidad cross-package | Root + TODOS los afectados | Alta |
| Breaking change | Root + TODOS | Crítica |
| Solo bug fix (sin API changes) | Ninguno (version patch) | Baja |

**Regla**: Si cambia la API pública (nuevo parámetro, nuevo endpoint, nuevo comando), los READMEs se actualizan. Si es solo un fix interno, no.

---

## Formato de Commit para READMEs

```
docs(readme): update EN+ES for v{version} release

- Update version badges to {version}
- Add new {feature} documentation
- Sync Spanish translation
- Fix {correction}

Closes #{issue}
```

**Scope**: Usar `docs(readme)` para cambios en README. Si solo es un paquete: `docs(readme/core)`, `docs(readme/mcp-server)`, etc.

---

## Notas Finales

1. **El inglés es el source of truth** — siempre escribir primero en `README.md`, luego traducir a `README.es.md`
2. **Código no se traduce** — los bloques de código son idénticos en ambos idiomas (excepto comentarios)
3. **Versiones son sagradas** — si hay discrepancia de versión entre idiomas, el release se BLOQUEA
4. **NPM publica `README.md`** — los usuarios de npmjs.com ven la versión en inglés, que es el estándar
5. **GitHub muestra `README.md`** — la landing page del repo es la versión en inglés
6. **Este documento es LIVING** — actualizar cuando se agreguen nuevos paquetes o cambie la estructura
