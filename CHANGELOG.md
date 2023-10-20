# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added
- Initial config support for multiple Solid Catalog instances

### Changed
- Changed backend api calls to match the newly (pre)released SolidLab Catalog at https://catalog.solidlab.be
- Internal API and Types have been updated to better match the new Solid Catalog APIs.

## 0.5.0-beta.0 - 2023-10-20

## 0.4.0 - 2023-06-27

## 0.3.8-beta.0 - 2023-06-21

## 0.3.7 - 2023-06-21

## 0.3.6 - 2023-06-20

## 0.3.5 - 2023-06-20

## 0.3.4 - 2023-06-20

## 0.3.3 - 2023-06-20
### Fixed
- Multiline descriptions are now printed correctly by the GraphQL Schema Printer

## 0.3.2 - 2023-06-16

## 0.3.1 - 2023-06-12

## 0.3.0 - 2023-06-12
### Added
- Test cases added for generation of GraphQL Schema from SHACL.

### Changed
- The `lib` folder content was pulled up a directory.
- The `model` package is now at the root level.

### Removed
- Trivial test case was removed, in favor of actual test cases.
