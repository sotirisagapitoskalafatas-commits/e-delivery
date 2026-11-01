"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("e-delivery-theme");
    const prefersDark = saved === "dark";
    setDark(prefersDark);
    document.documentElement.dataset.theme = prefersDark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    window.localStorage.setItem("e-delivery-theme", nextDark ? "dark" : "light");
  }

  return (
    <button className="market-theme-toggle" type="button" onClick={toggleTheme} aria-pressed={dark} aria-label={dark ? "Ενεργοποίηση φωτεινού θέματος" : "Ενεργοποίηση σκοτεινού θέματος"}>
      <span aria-hidden="true">{dark ? "☾" : "☼"}</span><span>Θέμα</span>
    </button>
  );
}