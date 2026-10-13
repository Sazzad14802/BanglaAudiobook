// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "./main";
afterEach(cleanup);
let requests: { path: string; body: any }[];
beforeEach(() => {
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options: any = {}) => {
      requests.push({
        path,
        body: options.body ? JSON.parse(options.body) : null,
      });
      let data: any = [];
      if (path.endsWith("/admin-login"))
        data = {
          access_token: "test-only",
          user: { username: "Operator", account_type: "admin" },
        };
      if (path.includes("/admin/summary"))
        data = {
          listeners: 12,
          publishers: 3,
          pending_applications: 1,
          audiobooks: 9,
          open_reports: 0,
          queued_jobs: 2,
        };
      if (path.includes("/admin/users?"))
        data = [
          {
            id: "user-1",
            username: "Reader",
            email: "reader@example.com",
            account_type: "listener",
            publisher_status: "pending_approval",
            suspended: false,
          },
        ];
      return { ok: true, status: 200, json: async () => data };
    }),
  );
});
async function login() {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "example-password" },
  });
  fireEvent.click(screen.getByText("Sign in to workspace →"));
  await screen.findByText("A home for every story.");
}
test("dedicated login renders real returned dashboard counts", async () => {
  await login();
  await screen.findByText("12");
  expect(requests[0].path).toBe("/api/v1/auth/admin-login");
  expect(screen.getByText("12")).toBeTruthy();
});
test("suspension requires a reason and calls the authorized endpoint", async () => {
  await login();
  fireEvent.click(screen.getByText("People"));
  await screen.findByText("reader@example.com");
  fireEvent.click(screen.getByText("Suspend"));
  fireEvent.change(screen.getByLabelText("Decision reason"), {
    target: { value: "Investigation requires suspension" },
  });
  fireEvent.click(screen.getByText("Confirm suspend"));
  await waitFor(() =>
    expect(
      requests.some(
        (r) =>
          r.path === "/api/v1/admin/users/user-1/decision" &&
          r.body.action === "suspend" &&
          r.body.reason === "Investigation requires suspension",
      ),
    ).toBe(true),
  );
});
test("failed login stays on sign-in and shows server feedback", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Incorrect credentials" }),
    })),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: "wrong@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong" },
  });
  fireEvent.click(screen.getByText("Sign in to workspace →"));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("A home for every story.")).toBeNull();
});
