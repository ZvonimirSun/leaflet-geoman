# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Bump turf to 7.x and fix intersection logic (#1600)
- Bump dependencies

### Fixed

- Fix removing event listener for text hint marker (#1604)

## [2.18.3] - 2024

### Fixed

- Fix CSS control border radius

## [2.18.2] - 2024

### Fixed

- Improve release CI

## [2.18.1] - 2024

### Fixed

- Set checkout depth to 0 in CI

## [2.18.0] - 2024

### Added

- Add new option to disable vertex snapping - `snapVertex` (#1539)
- Show HintMarker at the last position if `continueDrawing` is enabled (#1536)

### Fixed

- Overwrite leaflet-interactive CSS while drawing for crosshair cursor (#1538)
- Only check self-intersection when `allowSelfIntersection` is false (#1537)
- Remove temp layers after editing/removing (#1534)
- Allow removal of holes in polygons while maintaining the minimum vertex count (#1475)
- Center text in TextLayer with CSS box-sizing (#1509)
- Fix dragging center marker of circle while snapping is disabled (#1532)
- Fix snapping when polyline has only one coordinate (#1526)
- Rename `resizableCircle` to `resizeableCircle` (#1518)
- Add missing type definition `name` in `Action` (#1514)
- Fix `setLang` to handle navigator.language formats (such as "fr-FR") (#1499)
- Fix typo in TypeScript definitions

## [2.17.0] - 2024

### Added

- Additional Control methods (#1295)
- Add fallback to English translation if translation is missing (#1461)
- Add sourcemaps to dist (#1480)

### Changed

- Update translations pt_br and add translations pt_pt (#1466)

### Fixed

- Backport Pro changes into OSS (#1490)
- Remove `:focus` of marker-icon style to fix marker jumping while zooming (#1488)
- Remove extra backslash in CSS `<\/style>` closing tag (#1481)
- Prevent opening popup on ignored layers while drawing (#1471)
- Prevent drawing of rectangle when the corners have the same position (#1470)
- Update TypeScript definition for Controls

## [2.16.0] - 2023

### Added

- Initial tracked release

[Unreleased]: https://github.com/geoman-io/leaflet-geoman/compare/v2.18.3...HEAD
[2.18.3]: https://github.com/geoman-io/leaflet-geoman/compare/v2.18.2...v2.18.3
[2.18.2]: https://github.com/geoman-io/leaflet-geoman/compare/v2.18.1...v2.18.2
[2.18.1]: https://github.com/geoman-io/leaflet-geoman/compare/v2.18.0...v2.18.1
[2.18.0]: https://github.com/geoman-io/leaflet-geoman/compare/v2.17.0...v2.18.0
[2.17.0]: https://github.com/geoman-io/leaflet-geoman/compare/v2.16.0...v2.17.0
[2.16.0]: https://github.com/geoman-io/leaflet-geoman/releases/tag/v2.16.0
