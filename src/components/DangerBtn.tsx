import React from "react";

export default function DangerBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "w-full rounded-2xl h-[52px] min-h-[52px] px-4 " +
        "border border-red-600 text-red-500 bg-transparent " +
        "hover:bg-red-600/10 active:bg-red-700/15 " +
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 focus-visible:ring-offset-2 " +
        className
      }
    />
  );
}
