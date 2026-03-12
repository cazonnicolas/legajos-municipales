"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackgroundBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.remove("bg-login", "bg-dashboard", "bg-legajo");

    if (pathname === "/") document.body.classList.add("bg-login");
    else if (pathname.startsWith("/dashboard")) document.body.classList.add("bg-dashboard");
    else if (pathname.startsWith("/legajos")) document.body.classList.add("bg-legajo");
  }, [pathname]);

  return null;
}
