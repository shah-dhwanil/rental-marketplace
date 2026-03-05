import { z } from "zod";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
export const PasswordResetEmailSchema = z.object({
  name: z.string().min(1, "name is required"),
  resetUrl: z.string().url("resetUrl must be a valid URL"),
  expiresInMinutes: z.number().int().positive().default(30),
});

export type PasswordResetEmailProps = z.infer<typeof PasswordResetEmailSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  name,
  resetUrl,
  expiresInMinutes = 30,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your Rental Marketplace password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Reset Request 🔑</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            We received a request to reset your password. Click the button below
            to choose a new one. This link will expire in {expiresInMinutes}{" "}
            minutes.
          </Text>
          <Section style={btnSection}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>
          <Text style={text}>
            If you did not request a password reset, please ignore this email.
            Your password will remain unchanged.
          </Text>
          <Text style={footer}>
            For security, never share this link with anyone.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 32px",
  borderRadius: "8px",
  maxWidth: "560px",
};

const h1: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "26px",
  fontWeight: "700",
  margin: "0 0 24px",
};

const text: React.CSSProperties = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const btnSection: React.CSSProperties = {
  textAlign: "center",
  margin: "16px 0 24px",
};

const button: React.CSSProperties = {
  backgroundColor: "#dc2626",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};

const footer: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: "20px",
};
