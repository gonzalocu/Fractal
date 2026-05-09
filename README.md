# Fractal

## Flujo de trabajo GitFlow

Este repositorio sigue el modelo **GitFlow**.

### Ramas principales

| Rama | Propósito |
|------|-----------|
| `main` | Código en producción. Solo recibe merges desde `release/*` y `hotfix/*`. |
| `develop` | Rama de integración. Base para nuevas features. |

### Ramas de soporte

| Prefijo | Origen | Destino | Propósito |
|---------|--------|---------|-----------|
| `feature/*` | `develop` | `develop` | Nuevas funcionalidades |
| `release/*` | `develop` | `main` + `develop` | Preparación de versión |
| `hotfix/*` | `main` | `main` + `develop` | Correcciones urgentes en producción |

### Convenciones de nombres

- `feature/descripcion-corta`
- `release/v1.2.0`
- `hotfix/descripcion-corta`

### Flujo típico

```
# Nueva feature
git checkout develop
git checkout -b feature/mi-feature
# ... trabajo ...
git checkout develop
git merge --no-ff feature/mi-feature
git branch -d feature/mi-feature

# Release
git checkout develop
git checkout -b release/v1.0.0
# ... ajustes finales, bump de versión ...
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0
git checkout develop
git merge --no-ff release/v1.0.0
git branch -d release/v1.0.0

# Hotfix
git checkout main
git checkout -b hotfix/fix-critico
# ... corrección ...
git checkout main
git merge --no-ff hotfix/fix-critico
git tag -a v1.0.1
git checkout develop
git merge --no-ff hotfix/fix-critico
git branch -d hotfix/fix-critico
```
