import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ---------- Mocks ----------

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com", user_metadata: { full_name: "Test User" } },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Stateful Supabase mock: tracks profile + supports username availability + tracks fetch
const profileStore: Record<string, any> = {
  "test-user-id": { id: "test-user-id", username: null, role: null, stream: null },
};

function makeQueryBuilder(table: string) {
  let filters: Record<string, any> = {};

  const builder: any = {
    select: () => builder,
    eq: (col: string, val: any) => {
      filters[col] = val;
      return builder;
    },
    neq: () => builder,
    in: () => builder,
    maybeSingle: async () => {
      if (table === "profiles" && filters.username) {
        // Username availability check — always "available" in test
        return { data: null, error: null };
      }
      if (table === "profiles" && filters.id) {
        return { data: profileStore[filters.id] || null, error: null };
      }
      return { data: null, error: null };
    },
    upsert: async (rows: any) => {
      if (table === "profiles") {
        const row = Array.isArray(rows) ? rows[0] : rows;
        profileStore[row.id] = { ...profileStore[row.id], ...row };
      }
      return { data: null, error: null };
    },
  };

  // For skill_tracks list query: select().eq().eq() returns array
  if (table === "skill_tracks") {
    builder.eq = (_c: string, _v: any) => builder;
    // make it awaitable
    builder.then = (resolve: any) =>
      resolve({
        data: [
          { id: "track-1", name: "Web Dev", description: "Build the web", stream: "btech", is_default: true },
          { id: "track-2", name: "DSA", description: "Data structures", stream: "btech", is_default: true },
        ],
        error: null,
      });
  }

  if (table === "skills") {
    builder.then = (resolve: any) => resolve({ data: [{ id: "s1" }, { id: "s2" }], error: null });
  }

  if (table === "user_skill_progress") {
    // upsert already covered
  }

  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeQueryBuilder(table),
  },
}));

// ---------- Test ----------

import Onboarding from "@/pages/Onboarding";

const renderOnboarding = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Onboarding E2E flow", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    profileStore["test-user-id"] = { id: "test-user-id", username: null, role: null, stream: null };
  });

  it("walks through all 4 steps and lands on /dashboard", async () => {
    renderOnboarding();

    // Step 1 — username
    expect(await screen.findByText(/Pick a username/i)).toBeInTheDocument();

    const usernameInput = screen.getByPlaceholderText("your_username");
    fireEvent.change(usernameInput, { target: { value: "test_user" } });

    await waitFor(() => expect(screen.getByText(/Available/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 2 — stream
    expect(await screen.findByText(/What are you studying/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /BTech/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 3 — goal
    expect(await screen.findByText(/What's your main goal/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Get a Job/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 4 — tracks
    expect(await screen.findByText(/Pick your skill tracks/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Web Dev")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Web Dev"));

    const submitBtn = screen.getByRole("button", { name: /Let's Go/i });
    fireEvent.click(submitBtn);

    // Final assertion — navigation to dashboard + profile persisted
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
    expect(profileStore["test-user-id"].username).toBe("test_user");
    expect(profileStore["test-user-id"].stream).toBe("btech");
    expect(profileStore["test-user-id"].primary_goal).toBe("job");
  });

  it("blocks Continue when username is invalid", async () => {
    renderOnboarding();
    const usernameInput = await screen.findByPlaceholderText("your_username");
    fireEvent.change(usernameInput, { target: { value: "ab" } }); // too short

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).toBeDisabled();
  });
});
