# Proposal: Email Attachments

## Motivation
The current `email_service` can send rich HTML emails, but has no way to include file attachments (e.g., PDF invoices, booking confirmations, receipts). Other microservices need to attach documents to outgoing emails as part of their workflows.

## Goal
Extend the `POST /send` API to optionally accept one or more file attachments, and forward them to Nodemailer so they are delivered as email attachments to the recipient.

Supported attachment sources:
1. **Inline base64** — caller provides the file content encoded in base64 directly in the JSON body. This is ideal for server-to-server use where the other service already has the file in memory.
2. **URL fetch** — caller provides a publicly accessible (or internally accessible) URL and the email service fetches and attaches the content at send time.

## Non-Goals
- No long-term file storage or attachment management.
- No virus scanning of uploaded content.
- No support for multipart/form-data uploads at this time (base64 inline covers the use case cleanly for inter-service calls).
