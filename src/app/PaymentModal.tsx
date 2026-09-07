import { useState, useEffect, useRef } from "react";
import { X, QrCode, CreditCard, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Club } from "./api";
import { ORG_CHARITIES_REG, ORG_CITY, ORG_NAME, SOS_CHARITIES_PHONE, SOS_CHARITIES_URL } from "./org";

const MAROON = "#8C1515";
const BLACK = "#111111";

const TITLE_ID = "payment-modal-title";

// Donate modal. Zelle tab shows a QR of the full enroll.zellepay.com URL with
// the decoded email/phone as text; the Payment tab lists non-Zelle methods.
export function PaymentModal({ club, onClose }: { club: Club; onClose: () => void }) {
  const links = club.paymentMethods.filter((m) => m.type !== "zelle" && m.value);
  const hasZelle = !!club.zelleUrl;
  const hasLink = links.length > 0;

  const [tab, setTab] = useState<"zelle" | "link">(hasZelle ? "zelle" : "link");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      prev?.focus();
    };
  }, [onClose]);

  const qrValue =
    tab === "zelle"
      ? club.zelleUrl || ""
      : links[0]?.value || "";

  const tabs = [
    hasZelle && { key: "zelle" as const, icon: <QrCode size={13} />, label: "Zelle QR" },
    hasLink && { key: "link" as const, icon: <CreditCard size={13} />, label: "Payment Link" },
  ].filter(Boolean) as { key: "zelle" | "link"; icon: JSX.Element; label: string }[];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-y-auto max-h-[90vh] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex items-start justify-between gap-4" style={{ background: BLACK }}>
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-1" style={{ color: MAROON }}>Pay Fees / Donate</div>
            <div id={TITLE_ID} className="text-white font-black text-xl uppercase leading-tight" style={{ fontFamily: "var(--font-display)" }}>{club.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close donation dialog"
            className="text-white/50 hover:text-white transition-colors mt-1 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {tabs.length > 1 && (
          <div className="flex border-b border-gray-200" role="tablist" aria-label="Payment method">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${tab === t.key ? "border-b-2" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                style={tab === t.key ? { color: MAROON, borderColor: MAROON } : {}}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-8 flex flex-col items-center">
          {tab === "zelle" ? (
            <>
              <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-inner mb-5">
                <QRCodeSVG value={qrValue || "https://eastlakewolfpack.org"} size={200} level="M" fgColor={BLACK} bgColor="#ffffff" />
              </div>
              <p className="text-gray-500 text-xs text-center mb-4">Scan with your phone to send a Zelle payment</p>
              <div className="w-full bg-gray-50 rounded-lg px-4 py-3 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Zelle To</div>
                <div className="font-bold text-sm break-all" style={{ color: BLACK }}>{club.zelleToken || "—"}</div>
              </div>
            </>
          ) : (
            <>
              {qrValue && (
                <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-inner mb-5">
                  <QRCodeSVG value={qrValue} size={200} level="M" fgColor={BLACK} bgColor="#ffffff" />
                </div>
              )}
              <p className="text-gray-500 text-xs text-center mb-4">Open a payment page in your browser</p>
              <div className="w-full flex flex-col gap-2">
                {links.map((m, i) => (
                  <a
                    key={m.id ?? i}
                    href={m.value || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-white font-black text-xs py-3 rounded-lg uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                    style={{ background: MAROON }}
                  >
                    {m.label || "Open Payment Page"} <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="px-6 pb-6 text-[11px] leading-relaxed text-gray-600 text-center">
          {ORG_NAME} is a 501(c)(3) nonprofit in {ORG_CITY}. Currently registered with the
          Washington Secretary of State as required by law. Registration number {ORG_CHARITIES_REG}.
          Additional financial information is available from the Charities Program at{" "}
          <a href={`tel:${SOS_CHARITIES_PHONE.replace(/-/g, "")}`} className="underline underline-offset-2">
            {SOS_CHARITIES_PHONE}
          </a>
          {" "}or{" "}
          <a href={SOS_CHARITIES_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            ccfs.sos.wa.gov
          </a>
          . State registration does not imply endorsement. We do not collect or store your payment
          details. Payments are completed through a third-party service you choose.
        </p>
      </div>
    </div>
  );
}
