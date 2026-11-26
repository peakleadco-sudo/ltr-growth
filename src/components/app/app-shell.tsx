"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar, type TopbarProps } from "./topbar";

export function AppShell({
  entitlements,
  isAdmin,
  topbar,
  children,
}: {
  entitlements: string[];
  isAdmin: boolean;
  topbar: Omit<TopbarProps, "onMenu">;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = useCallback(() => setMobileOpen(false), []);
  return (
    <div className="flex min-h-screen">
      <Sidebar entitlements={entitlements} isAdmin={isAdmin} mobileOpen={mobileOpen} onMobileClose={close} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar {...topbar} onMenu={() => setMobileOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
