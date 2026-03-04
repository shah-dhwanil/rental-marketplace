# Proposal: Email Service

## Motivation
Other microservices in the backend need a reliable way to send emails. Centralizing email sending into an `email_service` ensures consistent templating, centralized SMTP configuration (Gmail), and a unified API for dispatching various types of communications.

## Goal
Build a new `email_service` microservice that:
- Runs on **Bun** with **Hono.js** for the API server.
- Uses **Nodemailer** for SMTP delivery (configured for Gmail).
- Renders rich email templates using **React Email**.
- Validates all API requests using **Zod**.
- Uses a **TOML file** mapping mechanism to map an incoming "email type" string to the correct React component template.
- Dynamically validates the data payload specific to the requested email type template before sending.
