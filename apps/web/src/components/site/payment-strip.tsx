import { PaymentIcon } from "react-svg-credit-card-payment-icons";

const methods = [
  "Visa",
  "Mastercard",
  "PayPal",
  "Amex",
  "Maestro",
  "Discover",
  "UnionPay",
  "JCB",
  "Diners",
  "Alipay",
  "Swish",
] as const;

export function PaymentStrip() {
  return (
    <section aria-label="Payment methods" className="container-affix py-10 sm:py-12">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-12">
        <p className="shrink-0 text-center text-[0.95rem] leading-snug text-muted lg:max-w-[15rem] lg:text-left">
          One checkout for every way{" "}
          <span className="text-ink">your buyers like to pay.</span>
        </p>
        <div className="marquee-pause relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div
            className="animate-marquee flex w-max items-center gap-10 pr-10"
            style={{ ["--marquee-duration" as string]: "38s" }}
          >
            {[...methods, ...methods].map((m, i) => (
              <PaymentIcon
                key={i}
                type={m}
                format="logo"
                width={58}
                className="shrink-0 opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
