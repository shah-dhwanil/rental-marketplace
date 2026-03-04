import { z } from "zod";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
export const OrderConfirmationEmailSchema = z.object({
  customerName: z.string().min(1, "customerName is required"),
  orderId: z.string().min(1, "orderId is required"),
  propertyName: z.string().min(1, "propertyName is required"),
  checkIn: z.string().min(1, "checkIn is required"),
  checkOut: z.string().min(1, "checkOut is required"),
  totalAmount: z.number().positive("totalAmount must be a positive number"),
  currency: z.string().length(3, "currency must be a 3-letter ISO code").default("USD"),
});

export type OrderConfirmationEmailProps = z.infer<typeof OrderConfirmationEmailSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const OrderConfirmationEmail: React.FC<OrderConfirmationEmailProps> = ({
  customerName,
  orderId,
  propertyName,
  checkIn,
  checkOut,
  totalAmount,
  currency = "USD",
}) => {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(totalAmount);

  return (
    <Html>
      <Head />
      <Preview>Your booking #{orderId} is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Booking Confirmed ✅</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Your reservation has been confirmed. Here's a summary of your
            booking:
          </Text>

          <Section style={card}>
            <Row>
              <Column style={label}>Order ID</Column>
              <Column style={value}>#{orderId}</Column>
            </Row>
            <Row>
              <Column style={label}>Property</Column>
              <Column style={value}>{propertyName}</Column>
            </Row>
            <Row>
              <Column style={label}>Check-in</Column>
              <Column style={value}>{checkIn}</Column>
            </Row>
            <Row>
              <Column style={label}>Check-out</Column>
              <Column style={value}>{checkOut}</Column>
            </Row>
            <Row>
              <Column style={label}>Total</Column>
              <Column style={{ ...value, fontWeight: "700", color: "#4f46e5" }}>
                {formattedAmount}
              </Column>
            </Row>
          </Section>

          <Text style={footer}>
            Questions? Reply to this email and our support team will help you.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

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
  margin: "0 0 16px",
};

const text: React.CSSProperties = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const card: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  border: "1px solid #e5e7eb",
  padding: "16px",
  margin: "0 0 24px",
};

const label: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  paddingBottom: "8px",
  width: "40%",
};

const value: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "14px",
  paddingBottom: "8px",
};

const footer: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: "20px",
};
