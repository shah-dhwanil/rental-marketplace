# Proposal: Email Addressing Options

## Motivation
The `POST /send` endpoint currently only supports a single `to` field. Real-world email workflows require richer addressing:
- **Multiple recipients** (`to` as an array, already supported structurally but not documented clearly)
- **CC / BCC** for copying stakeholders or audit addresses without exposing them to primary recipients
- **Reply-To** for directing replies to a different address than the sender (e.g., a support inbox)
- **Custom headers** for downstream mail processing, threading, or integration with automation tools (e.g., `X-Campaign-ID`)
- **Tags** (stored as `X-Tag` headers or Gmail labels metadata) so other services can categorize outgoing emails for analytics

## Goal
Extend the `POST /send` request schema and the mailer service to accept and forward all of these optional addressing fields to Nodemailer, keeping the API fully backward-compatible.

## Non-Goals
- No UI for managing tags or header presets.
- No storage or querying of sent email metadata.
- No enforcement of allowed custom header names (passed through as-is).
