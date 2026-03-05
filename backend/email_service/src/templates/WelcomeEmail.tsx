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
// Zod schema – exported so the registry can use it for validation
// ---------------------------------------------------------------------------
export const WelcomeEmailSchema = z.object({
  name: z.string().min(1, "name is required"),
  loginUrl: z.string().url("loginUrl must be a valid URL").optional(),
});

export type WelcomeEmailProps = z.infer<typeof WelcomeEmailSchema>;

// ---------------------------------------------------------------------------
// React Email component
// ---------------------------------------------------------------------------
export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name,
  loginUrl = "https://rentalmarketplace.example.com/login",
}) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Rental Marketplace, {name}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome, {name}! 🎉</Heading>
          <Text style={text}>
            We're thrilled to have you on board at Rental Marketplace. Start
            browsing thousands of listings or list your own property today.
          </Text>
          <Section style={btnSection}>
            <Button href={loginUrl} style={button}>
              Get Started
            </Button>
          </Section>
          <Text style={footer}>
            If you did not create this account, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

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
  fontSize: "28px",
  fontWeight: "700",
  margin: "0 0 24px",
};

const text: React.CSSProperties = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 24px",
};

const btnSection: React.CSSProperties = {
  textAlign: "center",
  margin: "0 0 32px",
};

const button: React.CSSProperties = {
  backgroundColor: "#4f46e5",
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
