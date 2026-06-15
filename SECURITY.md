# Security Policy

## Supported Versions

This repository currently publishes prerelease builds only. Security fixes target the latest prerelease unless otherwise stated.

## Reporting a Vulnerability

Please do not open a public issue for security-sensitive reports.

Use GitHub private vulnerability reporting if it is enabled for this repository. If it is not available, contact the maintainers through the Moonweave Research GitHub organization with a minimal description and reproduction steps.

## Sensitive Data Notes

- The OpenAI-compatible BYO API provider stores the configured API key in Zotero preferences on the user's machine.
- Enabling context sending can transmit stored underline context to the configured external API.
- The `google-free` provider sends terms to an external Google Translate endpoint and is not suitable for confidential terms or unreleased research content.

