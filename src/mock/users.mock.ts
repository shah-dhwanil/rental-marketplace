import type { User } from "@/schemas/user.schema";

export const mockCurrentUser: User = {
  id: "user_001",
  email: "john.doe@example.com",
  phone: "+1-555-0123",
  firstName: "John",
  lastName: "Doe",
  avatar: "https://i.pravatar.cc/150?img=12",
  role: "user",
  addresses: [
    {
      id: "addr_001",
      street: "123 Main Street, Apt 4B",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
      isDefault: true,
    },
    {
      id: "addr_002",
      street: "456 Park Avenue",
      city: "New York",
      state: "NY",
      zipCode: "10022",
      country: "USA",
      isDefault: false,
    },
  ],
  emailVerified: true,
  phoneVerified: true,
  createdAt: "2025-06-15T10:00:00Z",
  updatedAt: "2026-01-20T14:30:00Z",
};

// Mock user for unauthenticated state
export const mockGuestUser = null;
