# Solid Development eXperience toolkit

SDX makes development of SOLID applications more enjoyable.

**To read more about the conceptual ideas concerning the SDX, see the [Powerpoint slides](https://github.com/SolidLabResearch/sdx/raw/master/.assets/sdk_sdx_concept.pptx)**

## Installation

```bash
npm i -g @solidlab/sdx
```

Requires at least node 18.0.0

## Usage

```bash
sdx search <type>
sdx type install <type>
sdx help
```

### Init workspace

Initializes a workspace for Solid Application Development.

```bash
sdx init [--force]
```
Writes 4 important files:

* `.solidmanifest`: manifest of your application
* `.sdxconfig`: config files for the sdx toolkit
* `package.json`: starting package.json for this project
* `sdx-types/`: folder that will contain the generated d.ts files

### Search types

Search for a SOLID data type.

```bash
sdx search [type]
```

Will search the central SOLID Types Catalog and any other repositories added to the `.sdxconfig` file for potential matches.

### Install type

Install a SOLID data type.

```bash
sdx install type [type]
```

Install a type into your local project. It will be added to the .solidmanifest file and will be auto-converted to a d.ts file in your `sdx-types/` folder.

## Contributing

Start the continuous development server with:

```bash
npm run dev
```
