# Install Vocab Flow

## Zotero GUI Install

1. Build or download `zotero-vocab-flow.xpi`.
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
