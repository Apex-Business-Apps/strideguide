import { useEffect, useState } from "react";

export default function UpdateToast() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(true);
    window.addEventListener("sw:update", h);
    return () => window.removeEventListener("sw:update", h);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-3 inset-x-3 rounded-xl bg-amber-50 text-amber-900 p-3 shadow z-50">
      <p className="font-medium">New version available.</p>
      <div className="mt-2 flex gap-2">
        <button className="px-3 py-2 rounded bg-amber-900 text-white hover:bg-amber-800 transition-colors" onClick={() => location.reload()}>Reload</button>
        <button className="px-3 py-2 rounded hover:bg-amber-100 transition-colors" onClick={() => setShow(false)}>Later</button>
      </div>
    </div>
  );
}
