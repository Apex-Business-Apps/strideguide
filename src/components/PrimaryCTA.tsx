import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export default function PrimaryCTA({ children, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      data-variant="primary-cta"
      className={
        "rounded-2xl px-6 h-[56px] min-h-[56px] text-base md:text-lg font-semibold " +
        "bg-indigo-600 text-white border border-indigo-400 " +
        "hover:bg-indigo-500 active:bg-indigo-700 " +
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 " +
        "w-full " + className
      }
      aria-label="Primary call to action"
    >
      {children}
    </button>
  );
}
