# Install Vocab Flow

## Zotero GUI Install

1. Download `zotero-vocab-flow.xpi` from the latest GitHub prerelease or build it locally.
2. Open Zotero.
3. Go to `Tools` -> `Plugins`.
4. Open the gear menu.
5. Choose `Install Plugin From File`.
6. Select `zotero-vocab-flow.xpi`.
7. Restart Zotero if prompted.

Copying the XPI directly into the profile extension folder is not a normal install path for users. Use Zotero's plugin installer.

## Local Build

```bash
npm install
npm run build
```

The XPI is written to:

```text
zotero-vocab-flow.xpi
```

## Runtime Support

Validated target:

- Zotero 9
- macOS local profile validation

The plugin manifest allows Zotero `9.0` through `9.0.*`.

## Updates

Vocab Flow uses Zotero's JSON update manifest:

```text
https://raw.githubusercontent.com/Moonweave-Research/zotero-vocab-flow/main/updates.json
```

Existing v0.1.0-beta.1 installs used an inert update URL. Install v0.1.1-beta.1 manually once to receive future updates through Zotero's plugin update check.
